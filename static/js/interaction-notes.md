`interaction.js` - Warnings and Information
----------

1. For the architecture of this program, I was trying to use a mixin-based system
instead of classical inheritance hierarchies. It didn't quite go to plan
however, so the result is quite ugly - it is basically inheritance, but without
the nice syntax :(

    I still have much to learn ...

2. InteractJS uses the known properties of the object you give it to initialise an
internal object. This results in all of your custom properties being removed, so
don't use 'this' or reference any custom methods in your callbacks, as it won't
work.

3. An issue arose relating to the behaviour of position: and transform: properties
where position: absolute|fixed|sticky did NOT work as expected inside an element
with transform: set as anything other than 'none'.

    This behaviour is apparently required by the CSS specification, though many
consider it as a bug:
    - https://bugs.chromium.org/p/chromium/issues/detail?id=20574&desc=2
    - https://www.w3.org/Bugs/Public/show_bug.cgi?id=16328
        - continued: https://github.com/w3c/csswg-drafts/issues/913
    - https://stackoverflow.com/questions/2637058
