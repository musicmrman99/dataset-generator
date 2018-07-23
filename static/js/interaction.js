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
