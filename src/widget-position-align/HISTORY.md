Widget Position Align Change History
====================================

@VERSION@
------

* No changes.

3.16.0
------

* No changes.

3.15.0
------

* No changes.

3.14.1
------

* No changes.

3.14.0
------

* No changes.

3.13.0
------

* No changes.

3.12.0
------

* No changes.

3.11.0
------

* Moved implementation code from the Constructor to the `initializer`
  to account for Base order of operation changes in this release.

  This is one of the older extensions which needed to be upgraded
  after `initializer` support was added for extensions.

  This has no end user impact.

3.10.3
------

* No changes.

3.10.2
------

* No changes.

3.10.1
------

* No changes.

3.10.0
------

* No changes.

3.9.1
-----

* No changes.

3.9.0
-----

* No changes.

3.8.1
-----

* No changes.

3.8.0
-----

  * No changes.

3.7.3
-----

  * No changes.

3.7.2
-----

  * No changes.

3.7.1
-----

  * No changes.

3.7.0
-----

  * No changes.

3.6.0
-----

  * No changes.

3.5.1
-----

  * No changes.

3.5.0
-----

  * No changes.

3.4.1
-----

  * The widget's alignment is now re-synced to the DOM every time the widget's
    `visible` Attribute is changed to `true`. [Ticket #2530779]

  * Syncing the current alignment to the DOM is now supported in the public API
    by calling `align()` with no arguments. [Ticket #2529911]

3.4.0
-----

  * Added `alignOn` attribute which allows the implementer to specify when the
    Widget should be re-aligned.

3.3.0
-----

  * No changes.

3.2.0
-----

  * No changes.

3.1.1
-----

  * No changes.

3.1.0
-----

  * Renamed module from `widget-position-ext` to `widget-position-align`.

3.0.0
-----

  * Initial release.
