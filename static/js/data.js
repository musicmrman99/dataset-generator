"use strict";

// DEPENDS: objects.js

/*
Support Functions
--------------------------------------------------
*/

// Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
function deepFreeze(object) {
    // Retrieve the property names defined on object
    var propNames = Object.getOwnPropertyNames(object);

    // Freeze properties
    for (let name of propNames) {
        let value = object[name];

        // If not frozen
        object[name] = value && typeof value === "object" ? 
        deepFreeze(value) : value;
    }

    // Freeze self
    return Object.freeze(object);
}

/*
Data Packaging and Management
--------------------------------------------------
*/

/*
var concept = {
    "tblTableName": {
        "_settings_": {
            "records": 0
        },

        "_fields_": {
            "PrimaryKey": {
                "_settings_": {
                    ...
                }
            },

            ...
        }
    },

    ...
};
*/

const data = Object.freeze({
    /*
    Error Handling
    ----------
    */

    /** Used to delimit the hierarchical context when represented as a string. */
    contextDelimiter: " > ",

    /** Used to separate the context from the error message when errors occur. */
    errorDelimiter: ": ",

    /**
     * Build an error message from the given context and messages.
     * 
     * @param context The context of the error.
     * @param messages The messages to include at the end of the error.
     */
    build_error: function (context, ...messages) {
        var errorMsg = "";

        console.log(context)
        // First, go through the current context (as context strings).
        Object.keys(context).forEach((frame) => {
            errorMsg += this.contextDelimiter + context[frame];
        })

        // Then, go through the arguments (as error strings) except for the
        // first (which is context).
        messages.forEach((message) => {
            errorMsg += this.errorDelimiter + message;
        });

        return Error(errorMsg);
    },

    /*
    Building Data Objects from the DOM
    ----------
    */

    /**
     * Build a JS object representation of the settings overlay in the given
     * object.
     * 
     * @param context The current build context.
     * @param objectElement An object (DOM element) with a settings overlay.
     * @param settingsClass The class used by the given object to identify its
     * settings overlay.
     */
    build_settings: function(context, objectElement, settingsClass) {
        context.settings = "Settings("+""+")";

        const settingsOverlayContent = objectElement
            .getElementsByClassName(settingsClass)[0]
            .getElementsByClassName("overlay-content")[0];

        const fieldsets = Array.prototype.filter.call(
            settingsOverlayContent.children, function (elem) {
                return settings.is_fieldset(elem);
            });

        // build_fieldset():
        /*
        allInputs = all inputs in the fieldset
        subInputs = all inputs inside another fieldset in the fieldset
        paramInputs =  all inputs in params of the inputs in the fieldset
        primaryInputs = allInputs - subInputs - paramInputs

        forEach primaryInput:
            has_params(primaryInput)?
                this.build_params(inputParams)

        forEach subInput:
            build_fieldset(subInput);

        return (
            primaryInputs.map((input) => {[input.data-name]: input.value}) +
            ...
        );
        */

        fieldsets.forEach((fieldset) => {
            const primaryInputs = fieldset.querySelectorAll("[data-name]").filter((elem) => {
                //
            });
        });

        delete context.settings;

        return {
            //
        };
    },

    /** Build a JS object representation of the given field. */
    build_field: function (context, field) {
        // Get field name
        const fieldName = field.querySelector("[data-name=field-name]")
            .value;
        context.field = "field("+fieldName+")";

        // Build settings of this field
        const settings = this.build_settings(
            context, field, "obj-instance-field-settings");

        delete context.field;

        // NOTE: requires ES6
        return {[fieldName]: {
            "_settings_": settings
        }};
    },

    /** Build a JS object representation of the given table. */
    build_table: function (context, table) {
        // Get table name
        const tableName = table.querySelector("[data-name=table-name]")
            .value;
        context.table = "table("+tableName+")";

        // Build settings of this table
        const settings = this.build_settings(
            context, table, "obj-instance-table-settings");

        // Create fields list
        const fields = {};
        const fieldsContainer = table.getElementsByClassName(
            "obj-instance-table-fields")[0];
        const fieldElements = fieldsContainer.getElementsByClassName(
            "obj-instance-field");

        var fieldElement;
        var field;
        for (var i=0; i < fieldElements.length; i++) {
            fieldElement = fieldElements[i];
            field = this.build_field(context, fieldElement);

            // A field should have one key:value pair - {"FieldName":{...}}.
            if (Object.keys(field).length !== 1) {
                throw this.build_error(context,
                    "invalid field object",
                    "should have one property - the name of the field");
            }

            // A field with the same name should not already exist in this table.
            if (Object.keys(field)[0] in fields) {
                throw this.build_error(context,
                    "field already exists");
            }

            Object.assign(fields, field);
        }

        delete context.table;

        // NOTE: requires ES6
        return {[tableName]: {
            "_settings_": settings,
            "_fields_": fields
        }};
    },

    /**
     * Build a JS object representation of the objects in the given workspace.
     */
    build: function (workspace) {
        const context = {};

        const tables = {};
        const tableElements = workspace.getElementsByClassName(
            "obj-instance-table");

        var tableElement;
        var table;
        for (var i=0; i < tableElements.length; i++) {
            tableElement = tableElements[i];
            table = this.build_table(context, tableElement);

            // A table should have one key:value pair - {"tblTableName":{...}}.
            if (Object.keys(table).length !== 1) {
                throw this.build_error(context,
                    "invalid table object",
                    "should have one property - the name of the table");
            }

            // A table with the same name should not already exist.
            if (Object.keys(table)[0] in tables) {
                throw this.build_error(context,
                    "table already exists");
            }

            Object.assign(tables, table);
        }

        return tables;
    }
})
