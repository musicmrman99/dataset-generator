"use strict";

/*
Support Functions
--------------------------------------------------
*/

// Get the container this element is in. An element is a container if
// is_container returns true, given that element.
// If the given element is not in a container, then return null.
function get_container (element, is_container) {
    while (!is_container(element)) {
        element = element.parentElement;
        if (element == null) {
            return null;
        }
    }
    return element;
}

/*
Draggable Types
--------------------------------------------------
*/

/**
 * Return an object that can be given for the 'restriction' property in an
 * initialiser for InteractJS's .draggable() method.
 * Implements basic restriction - to the entire rect of the element given.
 * Default to the '#content' element.
 */
function restrict_to (restriction, assign) {
    return Object.assign({
        restriction: (restriction != null ? restriction : "#content"),
        endOnly: false, // restrict during drag
        elementRect: { top: 0, left: 0, bottom: 1, right: 1 } // use the whole content
    }, assign);
}

/**
 * Return an initialiser object for InteractJS's .draggable() method.
 * 
 * Implements the basic behaviour of a draggable object - to move when dragged.
 */
function draggable (assign) {
    return Object.assign({
        inertia: false, // disable inertial throwing
        autoScroll: false, // enable auto-scroll
        ignoreFrom: "input, button, a, .overlay",

        // can only be moved within the content area
        restrict: restrict_to(null),

        onstart: function (event) {
            const target = event.target;
            if (target.getAttribute('data-x') == null) {
                target.setAttribute('data-x', 0);
            }
            if (target.getAttribute('data-y') == null) {
                target.setAttribute('data-y', 0);
            }
        },
    
        onmove: function (event) {
            const target = event.target;
            
            // Implement 'normal' drag behaviour!
            const x = parseFloat(target.getAttribute("data-x")) + event.dx;
            const y = parseFloat(target.getAttribute("data-y")) + event.dy;
        
            target.style.webkitTransform =
            target.style.transform =
            "translate("+x+"px, "+y+"px)";
        
            target.setAttribute("data-x", x);
            target.setAttribute("data-y", y);
        },
    
        onend: function (event) {}
    }, assign);
}

/**
 * Return an initialiser object for InteractJS's .draggable() method.
 * 
 * Implements behaviour of a draggable resetting its position when dropped.
 */
function resetting_draggable (assign) {
    const baseDraggable = draggable();
    const baseDraggable__onend = baseDraggable.onend;

    return Object.assign(baseDraggable, {
        onend: function (event) {
            baseDraggable__onend(event);

            const target = event.target;
    
            // Translate the element back to original position.
            target.style.webkitTransform =
            target.style.transform =
            "translate(0px, 0px)";
    
            target.setAttribute("data-x", 0);
            target.setAttribute("data-y", 0);
        }
    }, assign);
}

/*
Dropzone Types
--------------------------------------------------
*/

/**
 * Enum: Dropzone Types
 * 
 * The types of dropzone. Use these when constructing a dropzone.
 */
const dzTypes = Object.freeze({
    create: "create",
    delete: "delete",
    move: "move"
});

/**
 * Return an initialiser object for InteractJS's .dropzone() method.
 * 
 * Implements basic dropzone behaviour - outline on drag and hover of a
 * draggable.
 */
function dropzone(type, assign) {
    return Object.assign({
        accept: "*",
        overlap: 0.50,

        ondropactivate: function (event) {
            event.target.classList.add("dropzone-"+type+"-dragactive");
        },
        ondragenter: function (event) {
            event.target.classList.add("dropzone-"+type+"-active");
        },
        ondragleave: function (event) {
            event.target.classList.remove("dropzone-"+type+"-active");
        },
        ondrop: function (event) {
            event.target.classList.remove("dropzone-"+type+"-dragactive");
            event.target.classList.remove("dropzone-"+type+"-active");
        },
        ondropdeactivate: function (event) {
            event.target.classList.remove("dropzone-"+type+"-dragactive");
            event.target.classList.remove("dropzone-"+type+"-active");
        }
    }, assign);
}

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
        return (element.nodeName.toLowerCase() === "fieldset") && 
            (element.getAttribute("data-input-type") === type);
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

/*
Interaction Setup
--------------------------------------------------
*/

/**
 * Set up the workspace as a dropzone.
 * 
 * This dropzone responds to the table type - to drop create new tables in it.
 */
function setup_workspace_dropzone () {
    const baseDrop = dropzone(dzTypes.create);
    const baseDrop__ondrop = baseDrop.ondrop;
    interact("#workspace").dropzone(Object.assign(baseDrop, {
        accept: "#obj-type-table",
        ondrop: function (event) {
            baseDrop__ondrop(event);
            table.create(event.target);
        }
    }));
}

/**
 * Set up the sidebar as a dropzone.
 * 
 * This dropzone responds to object instances (currently tables and fields), to
 * delete objects dragged into it.
 */
function setup_sidebar_dropzone () {
    const baseDrop = dropzone(dzTypes.delete);
    const baseDrop__ondrop = baseDrop.ondrop;
    interact("#sidebar").dropzone(Object.assign(baseDrop, {
        accept: ".obj-instance-table, .obj-instance-field",
        ondrop: function (event) {
            baseDrop__ondrop(event);
            if (table.is_table(event.relatedTarget)) {
                table.delete(event.relatedTarget);
            } else if (field.is_field(event.relatedTarget)) {
                field.delete(event.relatedTarget);
            }
        }
    }));
}

/**
 * Set up tables as dropzones.
 * 
 * These dropzones respond to the field object type, to create new fields, and
 * field instance objects, to move those objects into the table.
 */
function setup_table_dropzone () {
    const baseDropCreate = dropzone(dzTypes.create);
    const baseDropMove = dropzone(dzTypes.move);
    const baseDrop = {
        ondropactivate: function (event) {
            if (field.is_field_type(event.relatedTarget)) {
                baseDropCreate.ondropactivate(event);
            } else if (field.is_field(event.relatedTarget)) {
                baseDropMove.ondropactivate(event);
            }
        },
        ondragenter: function (event) {
            if (field.is_field_type(event.relatedTarget)) {
                baseDropCreate.ondragenter(event);
            } else if (field.is_field(event.relatedTarget)) {
                baseDropMove.ondragenter(event);
            }
        },
        ondragleave: function (event) {
            if (field.is_field_type(event.relatedTarget)) {
                baseDropCreate.ondragleave(event);
            } else if (field.is_field(event.relatedTarget)) {
                baseDropMove.ondragleave(event);
            }
        },
        ondrop: function (event) {
            if (field.is_field_type(event.relatedTarget)) {
                baseDropCreate.ondrop(event);
            } else if (field.is_field(event.relatedTarget)) {
                baseDropMove.ondrop(event);
            }
        },
        ondropdeactivate: function (event) {
            if (field.is_field_type(event.relatedTarget)) {
                baseDropCreate.ondropdeactivate(event);
            } else if (field.is_field(event.relatedTarget)) {
                baseDropMove.ondropdeactivate(event);
            }
        }
    };
    const baseDrop__ondrop = baseDrop.ondrop;

    interact(".obj-instance-table").dropzone(Object.assign(baseDrop, {
        accept: "#obj-type-field, .obj-instance-field",
        ondrop: function (event) {
            baseDrop__ondrop(event);
            if (field.is_field_type(event.relatedTarget)) {
                field.create(event.target);
            } else if (field.is_field(event.relatedTarget)) {
                field.move(event.relatedTarget, event.target);
            }
        }
    }));
}

// Create interactable objects
// ----------

interact(".obj-type").draggable(resetting_draggable());
interact(".obj-instance-table").draggable(draggable());
interact(".obj-instance-field").draggable(resetting_draggable());

// Create dropzones
// ----------

setup_workspace_dropzone();
setup_sidebar_dropzone();
setup_table_dropzone();

// Add the dropzone class to relevant initial DOM Elements
// ----------

document.getElementById("workspace").classList.add("dropzone");
document.getElementById("sidebar").classList.add("dropzone");
