"use strict";

/*
Support Functions
--------------------------------------------------
*/

// Get the container this element is in. An element is a container if
// isContainer returns true, given that element.
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

function restrict_to (restriction, assign) {
    return Object.assign({
        restriction: (restriction != null ? restriction : "#content"),
        endOnly: false, // restrict during drag
        elementRect: { top: 0, left: 0, bottom: 1, right: 1 } // use the whole content
    }, assign);
}

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

// dropzone types
const dzTypes = Object.freeze({
    create: "create",
    delete: "delete",
    move: "move"
});

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

// fieldset types
const fsTypes = Object.freeze({
    radio: "radio",
    checkbox: "checkbox"
});

const settings = Object.freeze({
    /*
    Support Functions
    ----------
    */

    // check if is a fieldset
    // if type is given, the fieldset must be of that type as well
    is_fieldset: function (element, type) {
        return (element.nodeName.toLowerCase() === "fieldset") && 
            (element.getAttribute("data-input-type") === type);
    },

    // check if has parameters
    has_params: function (input) {
        return (input.parentElement // should be a div
            .getElementsByClassName("input-params").length != 0);
    },

    // toggle (show/hide) the parameters sub-section of an input
    toggle_params: function (input) {
        input.parentElement // should be a div
            .getElementsByClassName("input-params")[0]
            .classList.toggle("hidden");
    },

    /*
    Setup + Tear-down Functions
    ----------
    */

    // set the title 
    set_title: function (settingsOverlay, title) {
        settingsOverlay.getElementsByClassName("settings-title")[0]
            .textContent = title;
    },

    // set the names and ids of submittable/labeled inputs to their data-*
    // values (for grouping functionality, eg. radio buttons)
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

    // unset the names and ids of submittable/labeled inputs from their
    // data-* values (for grouping functionality, eg. radio buttons)
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

    // set the event listeners for all radio/checkbox inputs in the settings
    // overlay
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

    /*
    Radio Buttons
    ----------
    */

    // activate the given radio button (likely being passed 'this' on click)
    // this handles all of the work *other than* the actual switching (which is
    // done by the browser)
    activate_radio: function (selectedRadio) {
        // Get the previously selected radio of this container
        const radioFieldset = get_container(selectedRadio, (elem) => {
            return this.is_fieldset(elem, fsTypes.radio);
        });
        const currentRadios = radioFieldset.querySelectorAll(
            "input[type=radio][data-active]");

        // NOTE: this allows recursive input parameters (ie. an input with
        //       parameters, which have parameters, etc.) by limiting the
        //       'active input' to this input set.
        // NOTE: this is linear time, so large inputs (HTML) may be problematic
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

    // toggle the given checkbox (likely being passed 'this' on click)
    // this handles all of the work *other than* the actual check/uncheck (which
    // is done by the browser)
    toggle_checkbox: function (checkbox) {
        if (this.has_params(checkbox)) {
            this.toggle_params(checkbox); // on/off
        }
    }
});

const table = Object.freeze({
    // check if is the table type itself
    is_table_type: function (element) {
        return element.id === "obj-type-table";
    },

    // check if is a table instance
    is_table: function (element) {
        return element.classList.contains("obj-instance-table");
    },

    // create a new table in target
    create: function (target) {
        const template = document.getElementById("obj-type-table-template");
        const newObj = template.firstElementChild.cloneNode(true);
        newObj.className = template.firstElementChild.className;
        newObj.classList.add("dropzone");

        // Set up the object's settings
        const settingsOverlay = newObj
            .getElementsByClassName("obj-instance-table-settings")[0];
        settings.set_event_listeners(settingsOverlay);

        // Append the new object to the workspace
        target.appendChild(newObj);
        return newObj;
    },

    // delete table
    delete: function (tbl) {
        tbl.remove();
    },

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

const field = Object.freeze({
    // check if is the field type itself
    is_field_type: function(element) {
        return element.id === "obj-type-field";
    },

    // check if is a field instance
    is_field: function (element) {
        return element.classList.contains("obj-instance-field");
    },

    // create a new field in the target table
    create: function (target) {
        const template = document.getElementById("obj-type-field-template");
        const newObj = template.firstElementChild.cloneNode(true);
        newObj.className = template.firstElementChild.className;
        newObj.classList.add("dropzone");

        // Set up the object's settings
        const settingsOverlay = newObj
            .getElementsByClassName("obj-instance-field-settings")[0];
        settings.set_event_listeners(settingsOverlay);

        // Append the new object to the list of fields of the given table
        target.getElementsByClassName("obj-instance-table-fields")[0]
            .appendChild(newObj);
        return newObj;
    },

    // delete field
    delete: function (field) {
        field.remove();
    },

    // move field to the target table
    move: function (field, target) {
        target.getElementsByClassName("obj-instance-table-fields")[0]
            .appendChild(field);
    },

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
