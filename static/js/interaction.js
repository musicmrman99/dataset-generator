"use strict";

/*
Support Functions
--------------------------------------------------
*/

// Get the container this element is in. An element is a container if
// isContainer returns true, given that element.
// If the given element is not in a container, then return null.
function get_container (element, isContainer) {
    while (!isContainer(element)) {
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

var base_draggable_callbacks = Object.freeze({
    onstart: function (event) {
        var target = event.target;
        if (target.getAttribute('data-x') == null) {
            target.setAttribute('data-x', 0);
        }
        if (target.getAttribute('data-y') == null) {
            target.setAttribute('data-y', 0);
        }
    },

    onmove: function (event) {
        var target = event.target;
        
        // Implement 'normal' drag behaviour!
        var x = parseFloat(target.getAttribute("data-x")) + event.dx;
        var y = parseFloat(target.getAttribute("data-y")) + event.dy;
    
        target.style.webkitTransform =
        target.style.transform =
        "translate("+x+"px, "+y+"px)";
    
        target.setAttribute("data-x", x);
        target.setAttribute("data-y", y);
    },

    onend: function (event) {}
});

function restrictTo (restriction, assign) {
    return Object.assign({
        restriction: (restriction != null ? restriction : "#content"),
        endOnly: false, // restrict during drag
        elementRect: { top: 0, left: 0, bottom: 1, right: 1 } // use the whole content
    }, assign)
}

function draggable (assign) {
    return Object.assign({
        inertia: false, // disable inertial throwing
        autoScroll: false, // enable auto-scroll
        ignoreFrom: "input, button, a, .overlay",

        // can only be moved within the content area
        restrict: restrictTo(null),

        onstart: function (event) { base_draggable_callbacks.onstart(event); },
        onmove: function (event) { base_draggable_callbacks.onmove(event); },
        onend: function (event) { base_draggable_callbacks.onend(event); }
    }, assign);
}

function resetting_draggable (assign) {
    var base_draggable = draggable();
    var base_draggable__onend = base_draggable.onend;

    return Object.assign(base_draggable, {
        onend: function (event) {
            base_draggable__onend(event);

            var target = event.target;
    
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
    }, assign)
}

var dz_types = Object.freeze({
    create: "create",
    delete: "delete",
    move: "move"
})

/*
Object and Object Instance Types (and their functions)
--------------------------------------------------
*/

var table = {
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
        var template = document.getElementById("obj-type-table-template");
        var new_obj = template.firstElementChild.cloneNode(true);
        new_obj.classList.add("obj-instance", "obj-instance-table", "dropzone");

        target.appendChild(new_obj);
        return new_obj;
    },

    // delete table
    delete: function (tbl) {
        tbl.remove();
    },

    open_settings: function (inner_element) {
        var tbl = get_container(inner_element, this.is_table);

        // get the table's name
        var tblName = tbl.querySelector("[data-name=table-name]").value ||
            "[undefined]";

        // insert them into the settings overlay's title
        var settingsOverlay = tbl
            .getElementsByClassName("obj-instance-table-settings").item(0);
        settingsOverlay
            .getElementsByClassName("settings-title").item(0)
            .textContent = tblName;
        
        // NOTE: See /static/js/interaction-notes.md
        tbl.classList.add("no-transform");
        
        settingsOverlay.classList.remove("hidden");
    },
    close_settings: function (inner_element) {
        var tbl = get_container(inner_element, this.is_table);

        var settingsOverlay = tbl
            .getElementsByClassName("obj-instance-table-settings").item(0);
        settingsOverlay.classList.add("hidden");

        // NOTE: See /static/js/interaction-notes.md
        tbl.classList.remove("no-transform");
    }
}

var field = {
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
        var template = document.getElementById("obj-type-field-template");
        var new_obj = template.firstElementChild.cloneNode(true);
        new_obj.classList.add("obj-instance", "obj-instance-field", "dropzone");

        target.getElementsByClassName("obj-instance-table-fields").item(0)
            .appendChild(new_obj);
        return new_obj;
    },

    // delete field
    delete: function (field) {
        field.remove();
    },

    // move field to the target table
    move: function (field, target) {
        var fields_div = target
            .getElementsByClassName("obj-instance-table-fields").item(0)
            .appendChild(field);
    },

    open_settings: function (inner_element) {
        var field = get_container(inner_element, this.is_field);
        var tbl = get_container(field, table.is_table);

        // get the table's and field's names
        var tblName = tbl.querySelector("[data-name=table-name]").value ||
            "[undefined]";
        var fieldName = field.querySelector("[data-name=field-name]").value ||
            "[undefined]";

        // insert them into the settings overlay's title
        var settingsOverlay = field
            .getElementsByClassName("obj-instance-field-settings").item(0);
        settingsOverlay
            .getElementsByClassName("settings-title").item(0)
            .textContent = tblName+"."+fieldName;
        
        // NOTE: See /static/js/interaction-notes.md
        tbl.classList.add("no-transform");

        settingsOverlay.classList.remove("hidden");
    },
    close_settings: function (inner_element) {
        var field = get_container(inner_element, this.is_field);
        var tbl = get_container(field, table.is_table);

        var settingsOverlay = field
            .getElementsByClassName("obj-instance-field-settings").item(0);
        settingsOverlay.classList.add("hidden");

        // NOTE: See /static/js/interaction-notes.md
        tbl.classList.remove("no-transform");
    }
}

/*
Interaction Setup
--------------------------------------------------
*/

function setup_workspace_dropzone () {
    var base_drop = dropzone(dz_types.create);
    var base_drop__ondrop = base_drop.ondrop;
    interact("#workspace").dropzone(Object.assign(base_drop, {
        accept: "#obj-type-table",
        ondrop: function (event) {
            base_drop__ondrop(event);
            table.create(event.target)
        }
    }));
}

function setup_sidebar_dropzone () {
    var base_drop = dropzone(dz_types.delete);
    var base_drop__ondrop = base_drop.ondrop;
    interact("#sidebar").dropzone(Object.assign(base_drop, {
        accept: ".obj-instance-table, .obj-instance-field",
        ondrop: function (event) {
            base_drop__ondrop(event);
            if (table.is_table(event.relatedTarget)) {
                table.delete(event.relatedTarget);
            } else if (field.is_field(event.relatedTarget)) {
                field.delete(event.relatedTarget);
            }
        }
    }));
}

function setup_table_dropzone () {
    var base_drop_create = dropzone(dz_types.create);
    var base_drop_move = dropzone(dz_types.move);
    var base_drop = {
        ondropactivate: function (event) {
            if (field.is_field_type(event.relatedTarget)) {
                base_drop_create.ondropactivate(event);
            } else if (field.is_field(event.relatedTarget)) {
                base_drop_move.ondropactivate(event);
            }
        },
        ondragenter: function (event) {
            if (field.is_field_type(event.relatedTarget)) {
                base_drop_create.ondragenter(event);
            } else if (field.is_field(event.relatedTarget)) {
                base_drop_move.ondragenter(event);
            }
        },
        ondragleave: function (event) {
            if (field.is_field_type(event.relatedTarget)) {
                base_drop_create.ondragleave(event);
            } else if (field.is_field(event.relatedTarget)) {
                base_drop_move.ondragleave(event);
            }
        },
        ondrop: function (event) {
            if (field.is_field_type(event.relatedTarget)) {
                base_drop_create.ondrop(event);
            } else if (field.is_field(event.relatedTarget)) {
                base_drop_move.ondrop(event);
            }
        },
        ondropdeactivate: function (event) {
            if (field.is_field_type(event.relatedTarget)) {
                base_drop_create.ondropdeactivate(event);
            } else if (field.is_field(event.relatedTarget)) {
                base_drop_move.ondropdeactivate(event);
            }
        }
    }
    var base_drop__ondrop = base_drop.ondrop;

    interact(".obj-instance-table").dropzone(Object.assign(base_drop, {
        accept: "#obj-type-field, .obj-instance-field",
        ondrop: function (event) {
            base_drop__ondrop(event);
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

// Add the dropzone class to relevant DOM Elements
// ----------

document.getElementById("workspace").classList.add("dropzone");

var elem_list = document.querySelectorAll("#sidebar");
elem_list.forEach(function (elem) {
    elem.classList.add("dropzone");
})

// The dropzone class is set upon creation of objects.
// See table.create() and field.create()
