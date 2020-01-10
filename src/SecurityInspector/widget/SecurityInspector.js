/*jslint nomen: true, plusplus: true, eqeq: true, unparam: true*/
/*global mx, logger, dojo, define, require, browser, devel, console, document, jQuery, alert, mendix */
/*mendix */
/*
    SecurityInspector
    ========================

    @file      : SecurityInspector.js
    @version   : 1.0.1
    @author    : A Ramlawi
    @date      : 2018-3-13
    @copyright : TimeSeries
    @license   : Apache 2

    Documentation
    ========================
    This widget enables you to view objects from the client side and check your enitity access / security.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",

    "dojo/_base/lang",

    "SecurityInspector/lib/jquery",
    "dojo/text!SecurityInspector/widget/template/SecurityInspector.html",
    "SecurityInspector/lib/datatables",
    "SecurityInspector/lib/bootstrap"

], function (declare, _WidgetBase, _TemplatedMixin, lang, _jQuery,  widgetTemplate) {
    "use strict";

    var $ = _jQuery.noConflict(true);

    // Declare widget's prototype.
    return declare("SecurityInspector.widget.SecurityInspector", [ _WidgetBase, _TemplatedMixin ], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,
        randered: false,
        objectsTable: "",
        objectsDataSet: [],
        isVisible: true,


        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {
            logger.debug(this.id + ".constructor");
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function () {
            if (!this.isVisible) {
                $(".squareBox").remove();
                return;
            }
            var key, table, self = this, data, objectsJSON = mx.meta.getMap(), entityList = [];
            logger.debug(this.id + ".postCreate");
            //this._updateObjectsTable = this._updateObjectsTable.bind(this);
            this.TriggerBox = this._onClickHandler.bind(this);

            for (key in objectsJSON) {
                if (objectsJSON.hasOwnProperty(key)) {
                    if (objectsJSON[key].isPersistable()) {
                        entityList.push(Array.of(key));
                    }
                }
            }

            // Intitialise Overview table to select the entities to display.
            // Fix: 1.0.1 added retrieve option so it wont be initialized when the instance still lives.
            table = $('#EntityOverviewTable').DataTable({
                "retrieve" : true,
                "data": entityList,
                "select": true,
                "error": function (xhr, error, thrown) {
                    alert('error');
                },
                "columns": [
                    { "title": "Name" }
                ]
            });

            // Set on click event to trigger rendering object table.
            $('#EntityOverviewTable tbody').on('click', 'tr', function () {
                data = table.row(this).data();
                // Call update table
                lang.hitch(self, self._updateObjectsTable(data[0]));
            });
        },
        _updateObjectsTable : function (entityName) {
            if (!this.isVisible) {
                return;
            }
            this._fetchNewData(entityName);
        },

        _fetchNewData : function (entityName) {
            var objectsList, self = this;
            mx.data.get({
                xpath: "//" + entityName,
                callback: function (objs) {
                    console.log(objs);
                    objectsList = objs.map(function (obj) {
                        return (obj.jsonData.attributes);
                    });
                    self._createDataTable(self._createDataArray(objectsList), self._createHeaderArray(objectsList));
                },
                error: function (err) {
                    console.log(err);
                }
            });
        },

        _createDataArray: function (jsonArray) {
            var resultArray = [], key, i, displayKey, attributeObject;
            for (i = 0; i < jsonArray.length; i++) {
                attributeObject = {};
                for (key in jsonArray[i]) {
                    if (jsonArray[i].hasOwnProperty(key)) {
                        displayKey = key;
                        if (key.lastIndexOf(".") >= 0) {
                            displayKey = key.substring((key.lastIndexOf(".") + 1));
                        }
                        if ((jsonArray[i][key].value) == null) {
                            attributeObject[displayKey] = '';
                        } else if (Array.isArray(jsonArray[i][key].value)) {
                            attributeObject[displayKey] = jsonArray[i][key].value.toString();
                        } else if (jsonArray[i][key].hasOwnProperty('readonly')) {
                            attributeObject[displayKey] = jsonArray[i][key].value + " (RO)";
                        } else {
                            attributeObject[displayKey] = jsonArray[i][key].value;
                        }
                    }
                }
                resultArray.push(attributeObject);
            }
            return resultArray;
        },

        _createDataTable: function (dataArray, headerArray) {
            if (Array.isArray(dataArray) && dataArray.length) {
                this._hideNoResultsMessage();
                if ($.fn.DataTable.isDataTable('#ObjectOverviewTable')) {
                    $('#ObjectOverviewTable').DataTable().destroy();
                    $('#ObjectOverviewTable').empty();
                }
                this.objectsTable = $('#ObjectOverviewTable').DataTable({
                    "destroy": true,
                    "data": dataArray,
                    "columns": headerArray,
                    "aoColumnDefs": [
                        { "sWidth": "100px", "aTargets": [ "_all" ] },
                        { "targets": [ "_all" ], "render": function (data, type, row) {
                            if (typeof data === "string") {
                                if (data.toString().slice(-4) === "(RO)") {
                                    return '<span class="ellipsis" style="color: #25a22d;" title="' + data.slice(0, -4) + '">' + data.slice(0, -4) + '</span>';
                                }
                            }
                            return '<span class="ellipsis" title="' + data + '">' + data + '</span>';
                        }}
                    ],
                    "error": function (xhr, error, thrown) {
                        alert('error');
                    }
                });
                $(document).on('shown.bs.modal', function (e) {
                    $.fn.dataTable.tables({visible: true, api: true}).columns.adjust();
                });
            } else {
                if ($.fn.DataTable.isDataTable('#ObjectOverviewTable')) {
                    $('#ObjectOverviewTable').DataTable().destroy();
                    $('#ObjectOverviewTable').empty();
                    this._showNoResultsMessage();
                } else {
                    this._showNoResultsMessage();
                }
            }
        },
        _createHeaderArray: function (jsonArray) {
            var resultArray = [], key, attributeObject;
            for (key in jsonArray[0]) {
                if (jsonArray[0].hasOwnProperty(key)) {
                    attributeObject = {};
                    if (key.lastIndexOf(".") >= 0) {
                        attributeObject.data = key.substring((key.lastIndexOf(".") + 1));
                    } else {
                        attributeObject.data = key;
                    }
                    attributeObject.title = key;
                    resultArray.push(attributeObject);
                }
            }
            return resultArray;
        },
        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function (obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            this._executeCallback(callback, "_updateRendering");
        },
        _executeCallback: function (cb, from) {
            logger.debug(this.id + "._executeCallback" + (from ? " from " + from : ""));
            if (cb && typeof cb === "function") {
                cb();
            }
        },
        _onClickHandler: function () {
            $(".squareBox").toggle();
            $("#securityOverviewModal").modal("toggle");
            //$(".modal-securityInspector").toggle();
        },
        _showNoResultsMessage: function () {
            $('#noResultsMessage').show();
        },
        _hideNoResultsMessage: function () {
            $('#noResultsMessage').hide();
        }



    });
});

require(["SecurityInspector/widget/SecurityInspector"]);
