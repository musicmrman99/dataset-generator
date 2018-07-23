"use strict";

/*
Object and Object Instance Types (and their functions)
--------------------------------------------------
*/

/**
 * Enum: Fieldset Types
 * 
 * The valid types of fieldset (in addition to the generic type), as given in
 * the 'data-input-type' attribute. This attribute contains an invalid value if
 * it is not defined in this enum.
 */
const fsTypes = Object.freeze({
    radio: "radio",
    checkbox: "checkbox"
});

/** Contains methods and event handlers relating to the settings of objects. */
const settings = Object.freeze({
    /*
    Support Functions
    ----------
    */

    /**
     * Check if element is a fieldset.
     * 
     * If type is given, the fieldset must additionally be of that type. See
     * fsTypes.
     */
    is_fieldset: function (element, type) {
        const isFieldset = (element.nodeName.toLowerCase() === "fieldset");
        var isType = true;
        if (type != null) {
            isType = (element.getAttribute("data-input-type") === type);
        }

        return isFieldset && isType;
    },

    /**
     * Check if the given <input> element has parameters associated with it.
     * 
     * An element has parameters if it has a <div> element with the class
     * "input-params" in its parent's node tree.
     */
    has_params: function (input) {
        // NOTE: input.parentElement should be a div, but doesn't have to be.
        return (input.parentElement
            .getElementsByClassName("input-params").length != 0);
    },

    /**
     * Toggle (show/hide) the parameters of the given <input> element.
     * 
     * See has_params().
     */
    toggle_params: function (input) {
        // NOTE: input.parentElement should be a div, but doesn't have to be.
        input.parentElement.getElementsByClassName("input-params")[0]
            .classList.toggle("hidden");
    },

    /*
    Setup + Tear-down Functions
    ----------
    */

    /**
     * Set the title of the given settings overlay (a DOM element) to the given
     * string.
     */
    set_title: function (settingsOverlay, title) {
        settingsOverlay.getElementsByClassName("settings-title")[0]
            .textContent = title;
    },

    /**
     * Copy specific 'data-*' attributes of relevant inputs in the given
     * settings overlay (a DOM element) to their respective standard attributes.
     * 
     * For example, copy the 'data-name' attribute to the 'name' attribute.
     * 
     * This system facilitates object-specific grouping functionality, rather
     * than document-wide grouping (which would cause mis-behaviour). As there
     * may be multiple 'objects' (eg. tables) that share the same template, if
     * some attributes were set in the template, every object of that type would
     * have the same values. For most attributes, this would likely not be a
     * problem, but for others (such as 'name' and 'id') it would break the
     * 'unique' requirement of the DOM.
     * 
     * It would also create mis-behaviour, such as for radio buttons - multiple
     * table objects with the same 'name' for some of its settings would result
     * in mutual exclusivity across tables! As such, these attributes must be
     * set dynamically to avoid document-wide grouping or 'unique'-breaking
     * values.
     * 
     * Currently, this only sets the 'name' and 'id' attributes to their
     * 'data-*' values.
     */
    assign_data_attrs: function (settingsOverlay) {
        const submittableInputs = settingsOverlay.querySelectorAll("[data-name]");
        submittableInputs.forEach(function (elem) {
            elem.name = elem.getAttribute('data-name');
        });
        const labeledInputs = settingsOverlay.querySelectorAll("[data-id]");
        labeledInputs.forEach(function (elem) {
            elem.id = elem.getAttribute('data-id');
        });
    },

    /**
     * Unset specific attributes of relevant inputs (set them to "") in the
     * settings overlay (a DOM element).
     * 
     * See assign_data_attrs().
     */
    clear_data_attrs: function (settingsOverlay) {
        const submittableInputs = settingsOverlay.querySelectorAll("[data-name]");
        submittableInputs.forEach(function (elem) {
            elem.name = "";
        });
        const labeledInputs = settingsOverlay.querySelectorAll("[data-id]");
        labeledInputs.forEach(function (elem) {
            elem.id = "";
        });
    },

    /**
     * Set the event listeners for all relevant inputs in the given settings
     * overlay (a DOM element).
     * 
     * Currently, this only sets the event listeners for <input> elements of
     * type "radio" and "checkbox".
     */
    set_event_listeners: function (settingsOverlay) {
        const this_ = this; // Ah, joy.

        const radioInputs = settingsOverlay.querySelectorAll(
            "input[type=radio]");
        radioInputs.forEach((radioInput) => {
            radioInput.addEventListener("click", function () {
                this_.activate_radio(this);
            });
        });

        const checkboxInputs = settingsOverlay.querySelectorAll(
            "input[type=checkbox]");
        checkboxInputs.forEach((checkboxInput) => {
            checkboxInput.addEventListener("click", function () {
                this_.toggle_checkbox(this);
            });
        });
    },

    /**
     * Set the callback to call when the 'X' button is clicked.
     * 
     * NOTE: By default, 'this' inside the callback is the 'X' button itself.
     *       This can be overridden by passing this_.
     */
    set_close_operation: function (settingsOverlay, callback, this_) {
        const closeButton = settingsOverlay
            .getElementsByClassName("overlay-close")[0];

        if (this_ == null) {
            this_ = closeButton;
        }
        closeButton.addEventListener("click", function () {
            callback.call(this_);
        });
    },

    /*
    Radio Buttons
    ----------
    */

    /**
     * Activate the given radio button (<input type="radio">).
     * 
     * This handles all of the work *other than* the actual switching (which is
     * done by the browser).
     * 
     * Practically, this is likely being passed 'this' on the radio's click
     * event.
     */
    activate_radio: function (selectedRadio) {
        // Get the previously selected radio of this container
        const radioFieldset = get_container(selectedRadio, (elem) => {
            return this.is_fieldset(elem, fsTypes.radio);
        });
        const currentRadios = radioFieldset.querySelectorAll(
            "input[type=radio][data-active]");

        // NOTE: This allows recursive input parameters (ie. an input with
        //       parameters, which have parameters, etc.) by limiting the
        //       'active input' to this input set.
        // NOTE: This is linear time (worst-case), so large inputs (HTML) may be
        //       problematic.
        var currentRadio = null;
        for (var i=0; 0 < currentRadios.length; i++) {
            if (get_container(currentRadios[i], (elem) => {
                return this.is_fieldset(elem, fsTypes.radio);
            }) === radioFieldset) {
                currentRadio = currentRadios[i];
                break;
            }
        }

        // De-select previously selected radio
        if (currentRadio != null) {
            currentRadio.removeAttribute("data-active");
            if (this.has_params(currentRadio)) {
                this.toggle_params(currentRadio); // off
            }
        }

        // Select new radio
        selectedRadio.setAttribute("data-active", "true");
        if (this.has_params(selectedRadio)) {
            this.toggle_params(selectedRadio); // on
        }
    },

    /*
    Checkboxes
    ----------
    */

    /**
     * Toggle the given checkbox's checked status (<input type="checkbox">).
     * 
     * This handles all of the work *other than* the actual check/uncheck (which
     * is done by the browser).
     * 
     * Practically, this is likely being passed 'this' on the checkbox's click
     * event.
     */
    toggle_checkbox: function (checkbox) {
        if (this.has_params(checkbox)) {
            this.toggle_params(checkbox); // on/off
        }
    }
});

/** Contains methods and event handlers relating to table objects. */
const table = Object.freeze({
    /** Check if element is the table type itself. */
    is_table_type: function (element) {
        return element.id === "obj-type-table";
    },

    /** Check if element is a table instance. */
    is_table: function (element) {
        return element.classList.contains("obj-instance-table");
    },

    /** Create a new table in target (a DOM element). */
    create: function (target) {
        const this_ = this;

        const template = document.getElementById("obj-type-table-template");
        const newObj = template.firstElementChild.cloneNode(true);
        newObj.className = template.firstElementChild.className;
        newObj.classList.add("dropzone");

        // Set up the object's settings
        newObj.getElementsByClassName("settings-button")[0]
            .addEventListener("click", function() {
                this_.open_settings(this);
            });

        const settingsOverlay = newObj
            .getElementsByClassName("obj-instance-table-settings")[0];

        settings.set_event_listeners(settingsOverlay);
        settings.set_close_operation(settingsOverlay, function () {
            this_.close_settings(this);
        });

        // Append the new object to the workspace
        target.appendChild(newObj);
        return newObj;
    },

    /** Delete the given table (a DOM element). */
    delete: function (tbl) {
        tbl.remove();
    },

    /** Open the settings overlay for the table innerElement is contained in. */
    open_settings: function (innerElement) {
        const tbl = get_container(innerElement, this.is_table);
        const settingsOverlay = tbl
            .getElementsByClassName("obj-instance-table-settings")[0];

        // Set up the settings overlay
        const tblName = tbl.querySelector("[data-name=table-name]").value ||
            "[undefined]";

        settings.set_title(settingsOverlay, tblName);
        settings.assign_data_attrs(settingsOverlay);

        // NOTE: See /static/js/interaction-notes.md
        tbl.classList.add("no-transform");
        
        // Show the overlay
        settingsOverlay.classList.remove("hidden");
    },

    /** Close the settings overlay for the table innerElement is contained in. */
    close_settings: function (innerElement) {
        const tbl = get_container(innerElement, this.is_table);
        const settingsOverlay = tbl
            .getElementsByClassName("obj-instance-table-settings")[0];

        // Remove instance-unique (but not globally-unique) attrs
        settings.clear_data_attrs(settingsOverlay);

        // Hide the overlay
        settingsOverlay.classList.add("hidden");

        // NOTE: See /static/js/interaction-notes.md
        tbl.classList.remove("no-transform");
    }
});

/** Contains methods and event handlers relating to field objects */
const field = Object.freeze({
    /** Check if element is the field type itself. */
    is_field_type: function(element) {
        return element.id === "obj-type-field";
    },

    /** Check if element is a field instance. */
    is_field: function (element) {
        return element.classList.contains("obj-instance-field");
    },

    /** Create a new field in the target table (a DOM element). */
    create: function (target) {
        const this_ = this;

        const template = document.getElementById("obj-type-field-template");
        const newObj = template.firstElementChild.cloneNode(true);
        newObj.className = template.firstElementChild.className;
        newObj.classList.add("dropzone");

        // Set up the object's settings
        newObj.getElementsByClassName("settings-button")[0]
            .addEventListener("click", function() {
                this_.open_settings(this);
            });

        const settingsOverlay = newObj
            .getElementsByClassName("obj-instance-field-settings")[0];

        settings.set_event_listeners(settingsOverlay);
        settings.set_close_operation(settingsOverlay, function () {
            this_.close_settings(this);
        });

        // Append the new object to the list of fields of the given table
        target.getElementsByClassName("obj-instance-table-fields")[0]
            .appendChild(newObj);
        return newObj;
    },

    /** Delete the given field (a DOM element). */
    delete: function (field) {
        field.remove();
    },

    /**
     * Move the given field (a DOM element) to the target table (a DOM element).
     */
    move: function (field, target) {
        target.getElementsByClassName("obj-instance-table-fields")[0]
            .appendChild(field);
    },

    /** Open the settings overlay for the field innerElement is contained in. */
    open_settings: function (innerElement) {
        const field = get_container(innerElement, this.is_field);
        const tbl = get_container(field, table.is_table);
        const settingsOverlay = field
            .getElementsByClassName("obj-instance-field-settings")[0];

        // Set up the settings overlay
        const tblName = tbl.querySelector("[data-name=table-name]").value ||
            "[undefined]";
        const fieldName = field.querySelector("[data-name=field-name]").value ||
            "[undefined]";

        settings.set_title(settingsOverlay, tblName+"."+fieldName);
        settings.assign_data_attrs(settingsOverlay);

        // NOTE: See /static/js/interaction-notes.md
        tbl.classList.add("no-transform");
        field.classList.add("no-transform");

        // Show the overlay
        settingsOverlay.classList.remove("hidden");
    },

    /** Close the settings overlay for the field innerElement is contained in. */
    close_settings: function (innerElement) {
        const field = get_container(innerElement, this.is_field);
        const tbl = get_container(field, table.is_table);
        const settingsOverlay = field
            .getElementsByClassName("obj-instance-field-settings")[0];

        // Remove instance-unique (but not globally-unique) attrs
        settings.clear_data_attrs(settingsOverlay);

        // Hide the overlay
        settingsOverlay.classList.add("hidden");

        // NOTE: See /static/js/interaction-notes.md
        tbl.classList.remove("no-transform");
        field.classList.remove("no-transform");
    }
});
