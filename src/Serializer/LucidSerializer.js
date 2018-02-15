'use strict';

const _ = require('lodash');
const qs = require('qs');
const VanillaSerializer = require("@adonisjs/lucid/src/Lucid/Serializers/Vanilla");
const {TypeNotDefinedException} = require("../Exceptions");

const JsonApi = use('JsonApi');
const Logger = use('Logger');

class LucidSerializer extends VanillaSerializer {
    toJSON() {
        if (this.isOne) {
            const jsonApiType = JsonApi.getTypeOfModel(this.rows.constructor.name);
            if (jsonApiType !== undefined) {
                try {
                    return JsonApi.JsonApiSerializer.serialize(
                        jsonApiType,
                        this._getRowJSON(this.rows)
                    );
                } catch (error) {
                    Logger.warning(error);
                }
            } else {
                throw TypeNotDefinedException.invoke(this.rows.constructor.name);
            }
        } else {
            const jsonApiType = JsonApi.getTypeOfModel(this.rows[0].constructor.name);
            const data = this.rows.map(this._getRowJSON.bind(this));
            if (jsonApiType !== undefined) {
                try {
                    if (this.pages) {
                        const jsonApiPaged = JsonApi.JsonApiSerializer.serialize(jsonApiType, data);
                        if (_.has(jsonApiPaged, 'links.self')) {
                            this._setPageLinks(jsonApiPaged.links, jsonApiPaged.links.self);
                        }
                        jsonApiPaged.meta = _.merge({}, {
                            "_page": {
                                'number': this.pages._page,
                                'size': this.pages.perPage,
                                'pages': this.pages.lastPage
                            },
                            'total': this.pages.total
                        });
                        return jsonApiPaged;
                    } else {
                        const jsonApiList = JsonApi.JsonApiSerializer.serialize(jsonApiType, data);
                        jsonApiList.meta = _.merge({}, {'total': this.rows.length});
                        return jsonApiList;
                    }
                } catch (error) {
                    Logger.warning(error);
                }
            } else {
                throw TypeNotDefinedException.invoke(this.rows[0].constructor.name);
            }
        }
    }

    _setPageLinks(links, refLink) {
        links.first = refLink + '?' + qs.stringify({
            _page: {
                number: 1,
                size: this.pages.perPage
            }
        });
        links.prev = refLink + '?' + qs.stringify({
            _page: {
                number: this.pages._page > 1 ? (this.pages._page - 1) : 1,
                size: this.pages.perPage
            }
        });
        links.next = refLink + '?' + qs.stringify({
            _page: {
                number: this.pages._page >= this.pages.lastPage ? this.pages.lastPage : (this.pages._page + 1),
                size: this.pages.perPage
            }
        });
        links.last = refLink + '?' + qs.stringify({
            _page: {
                number: this.pages.lastPage,
                size: this.pages.perPage
            }
        });
        links.self = refLink + '?' + qs.stringify({
            _page: {
                number: this.pages._page,
                size: this.pages.perPage
            }
        });
    }
}

module.exports = LucidSerializer;
