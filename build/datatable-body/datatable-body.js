YUI.add('datatable-body', function(Y) {

/**
View class responsible for rendering the `<tbody>` section of a table. Used as
the default `bodyView` for `Y.DataTable.Base` and `Y.DataTable` classes.

@module datatable
@submodule datatable-body
@since 3.5.0
**/
var Lang         = Y.Lang,
    isArray      = Lang.isArray,
    isNumber     = Lang.isNumber,
    isString     = Lang.isString,
    fromTemplate = Lang.sub,
    htmlEscape   = Y.Escape.html,
    toArray      = Y.Array,
    bind         = Y.bind,
    YObject      = Y.Object,

    ClassNameManager = Y.ClassNameManager,
    _getClassName    = ClassNameManager.getClassName;

/**
View class responsible for rendering the `<tbody>` section of a table. Used as
the default `bodyView` for `Y.DataTable.Base` and `Y.DataTable` classes.

Translates the provided `modelList` into a rendered `<tbody>` based on the data
in the constituent Models, altered or ammended by any special column
configurations.

The `columns` configuration, passed to the constructor, determines which
columns will be rendered.

The rendering process involves constructing an HTML template for a complete row
of data, built by concatenating a customized copy of the instance's
`CELL_TEMPLATE` into the `ROW_TEMPLATE` once for each column.  This template is
then populated with values from each Model in the `modelList`, aggregating a
complete HTML string of all row and column data.  A `<tbody>` Node is then created from the markup and any column `nodeFormatter`s are applied.

Supported properties of the column objects include:

  * `key` - Used to link a column to an attribute in a Model.
  * `name` - Used for columns that don't relate to an attribute in the Model
    (`formatter` or `nodeFormatter` only) if the implementer wants a
    predictable name to refer to in their CSS.
  * `cellTemplate` - Overrides the instance's `CELL_TEMPLATE` for cells in this
    column only.
  * `formatter` - Used to customize or override the content value from the
    Model.  These do not have access to the cell or row Nodes and should
    return string (HTML) content.
  * `nodeFormatter` - Used to provide content for a cell as well as perform any
    custom modifications on the cell or row Node that could not be performed by
    `formatter`s.  Should be used sparingly for better performance.
  * `emptyCellValue` - String (HTML) value to use if the Model data for a
    column, or the content generated by a `formatter`, is the empty string,
    `null`, or `undefined`.
  * `allowHTML` - Set to `true` if a column value, `formatter`, or
    `emptyCellValue` can contain HTML.  This defaults to `false` to protect
    against XSS.
  * `className` - Space delimited CSS classes to add to all `<td>`s in a column.

Column `formatter`s are passed an object (`o`) with the following properties:

  * `value` - The current value of the column's associated attribute, if any.
  * `data` - An object map of Model keys to their current values.
  * `record` - The Model instance.
  * `column` - The column configuration object for the current column.
  * `className` - Initially empty string to allow `formatter`s to add CSS 
    classes to the cell's `<td>`.
  * `rowIndex` - The zero-based row number.
  * `rowClass` - Initially empty string to allow `formatter`s to add CSS
    classes to the cell's containing row `<tr>`.

They may return a value or update `o.value` to assign specific HTML content.  A
returned value has higher precedence.

Column `nodeFormatter`s are passed an object (`o`) with the following
properties:

  * `value` - The current value of the column's associated attribute, if any.
  * `td` - The `<td>` Node instance.
  * `cell` - The `<div>` liner Node instance if present, otherwise, the `<td>`.
    When adding content to the cell, prefer appending into this property.
  * `data` - An object map of Model keys to their current values.
  * `record` - The Model instance.
  * `column` - The column configuration object for the current column.
  * `rowIndex` - The zero-based row number.

They are expected to inject content into the cell's Node directly, including
any "empty" cell content.  Each `nodeFormatter` will have access through the
Node API to all cells and rows in the `<tbody>`, but not to the `<table>`, as
it will not be attached yet.

If a `nodeFormatter` returns `false`, the `o.td` and `o.cell` Nodes will be
`destroy()`ed to remove them from the Node cache and free up memory.  The DOM
elements will remain as will any content added to them.  _It is highly
advisable to always return `false` from your `nodeFormatter`s_.

@class BodyView
@namespace DataTable
@extends View
@since 3.5.0
**/
Y.namespace('DataTable').BodyView = Y.Base.create('tableBody', Y.View, [], {
    // -- Instance properties -------------------------------------------------

    /**
    HTML template used to create table cells.

    @property CELL_TEMPLATE
    @type {HTML}
    @default '<td {headers} class="{className}">{content}</td>'
    @since 3.5.0
    **/
    CELL_TEMPLATE: '<td {headers} class="{className}">{content}</td>',

    /**
    CSS class applied to even rows.  This is assigned at instantiation after
    setting up the `_cssPrefix` for the instance.
    
    For DataTable, this will be `yui3-datatable-even`.

    @property CLASS_EVEN
    @type {String}
    @default 'yui3-table-even'
    @since 3.5.0
    **/
    //CLASS_EVEN: null

    /**
    CSS class applied to odd rows.  This is assigned at instantiation after
    setting up the `_cssPrefix` for the instance.
    
    When used by DataTable instances, this will be `yui3-datatable-odd`.

    @property CLASS_ODD
    @type {String}
    @default 'yui3-table-odd'
    @since 3.5.0
    **/
    //CLASS_ODD: null

    /**
    HTML template used to create table rows.

    @property ROW_TEMPLATE
    @type {HTML}
    @default '<tr id="{rowId}" data-yui3-record="{clientId}" class="{rowClass}">{content}</tr>'
    @since 3.5.0
    **/
    ROW_TEMPLATE : '<tr id="{rowId}" data-yui3-record="{clientId}" class="{rowClass}">{content}</tr>',

    /**
    The object that serves as the source of truth for column and row data.
    This property is assigned at instantiation from the `source` property of
    the configuration object passed to the constructor.

    @property source
    @type {Object}
    @default (initially unset)
    @since 3.5.0
    **/
    //TODO: should this be protected?
    //source: null,

    // -- Public methods ------------------------------------------------------

    /**
    Returns the `<td>` Node from the given row and column index.  Alternately,
    the `seed` can be a Node.  If so, the nearest ancestor cell is returned.
    If the `seed` is a cell, it is returned.  If there is no cell at the given
    coordinates, `null` is returned.

    Optionally, include an offset array or string to return a cell near the
    cell identified by the `seed`.  The offset can be an array containing the
    number of rows to shift followed by the number of columns to shift, or one
    of "above", "below", "next", or "previous".

    <pre><code>// Previous cell in the previous row
    var cell = table.getCell(e.target, [-1, -1]);

    // Next cell
    var cell = table.getCell(e.target, 'next');
    var cell = table.getCell(e.taregt, [0, 1];</pre></code>

    @method getCell
    @param {Number[]|Node} seed Array of row and column indexes, or a Node that
        is either the cell itself or a descendant of one.
    @param {Number[]|String} [shift] Offset by which to identify the returned
        cell Node
    @return {Node}
    @since 3.5.0
    **/
    getCell: function (seed, shift) {
        var tbody = this.get('container'),
            row, cell, index, rowIndexOffset;

        if (seed && tbody) {
            if (isArray(seed)) {
                row = tbody.get('children').item(seed[0]);
                cell = row && row.get('children').item(seed[1]);
            } else if (Y.instanceOf(seed, Y.Node)) {
                cell = seed.ancestor('.' + this.getClassName('cell'), true);
            }

            if (cell && shift) {
                rowIndexOffset = tbody.get('firstChild.rowIndex');
                if (isString(shift)) {
                    // TODO this should be a static object map
                    switch (shift) {
                        case 'above'   : shift = [-1, 0]; break;
                        case 'below'   : shift = [1, 0]; break;
                        case 'next'    : shift = [0, 1]; break;
                        case 'previous': shift = [0, -1]; break;
                    }
                }

                if (isArray(shift)) {
                    index = cell.get('parentNode.rowIndex') +
                                shift[0] - rowIndexOffset;
                    row   = tbody.get('children').item(index);

                    index = cell.get('cellIndex') + shift[1];
                    cell  = row && row.get('children').item(index);
                }
            }
        }
        
        return cell || null;
    },

    /**
    Builds a CSS class name from the provided tokens.  If the instance is
    created with `cssPrefix` or `source` in the configuration, it will use this
    prefix (the `_cssPrefix` of the `source` object) as the base token.  This
    allows class instances to generate markup with class names that correspond
    to the parent class that is consuming them.

    @method getClassName
    @param {String} token* Any number of tokens to include in the class name
    @return {String} The generated class name
    @since 3.5.0
    **/
    getClassName: function () {
        var args = toArray(arguments);
        args.unshift(this._cssPrefix);
        args.push(true);

        return _getClassName.apply(ClassNameManager, args);
    },

    /**
    Returns the Model associated to the record index (not row index), or to the
    row Node or id passed.  If an id or Node for a child element of the row is
    passed, that will work, too.

    If no Model can be found, `null` is returned.

    @method getRecord
    @param {Number|String|Node} seed Record index, Node, or identifier for a row
        or child element
    @return {Model}
    @since 3.5.0
    **/
    getRecord: function (seed) {
        var modelList = this.get('modelList'),
            tbody     = this.get('container'),
            row       = null,
            record;

        if (isNumber(seed)) {
            record = modelList && modelList.item(seed);
        } else if (tbody) {
            if (isString(seed)) {
                record = modelList.getByClientId(seed);

                if (!record) {
                    seed = tbody.one('#' + seed);
                }
            }

            if (!record) {
                if (Y.instanceOf(seed, Y.Node)) {
                    row = seed.ancestor(function (node) {
                        return node.get('parentNode').compareTo(tbody);
                    }, true);

                    record = row &&
                        modelList.getByClientId(row.getData('yui3-record'));
                }
            }
        }

        return record || null;
    },

    /**
    Returns the `<tr>` Node from the given row index, Model, or Model's
    `clientId`.  If the rows haven't been rendered yet, or if the row can't be
    found by the input, `null` is returned.

    @method getRow
    @param {Number|String|Model} id Row index, Model instance, or clientId
    @return {Node}
    @since 3.5.0
    **/
    getRow: function (id) {
        var tbody = this.get('container') || null;

        if (id) {
            id = this._idMap[id.get ? id.get('clientId') : id] || id;
        }

        return tbody &&
            Y.one(isNumber(id) ? tbody.get('children').item(id) : '#' + id);
    },

    /**
    Creates the table's `<tbody>` content by assembling markup generated by
    populating the `ROW\_TEMPLATE`, and `CELL\_TEMPLATE` templates with content
    from the `columns` property and `modelList` attribute.

    The rendering process happens in three stages:

    1. A row template is assembled from the `columns` property (see
       `_createRowTemplate`)

    2. An HTML string is built up by concatening the application of the data in
       each Model in the `modelList` to the row template. For cells with
       `formatter`s, the function is called to generate cell content. Cells
       with `nodeFormatter`s are ignored. For all other cells, the data value
       from the Model attribute for the given column key is used.  The
       accumulated row markup is then inserted into the container.

    3. If any column is configured with a `nodeFormatter`, the `modelList` is
       iterated again to apply the `nodeFormatter`s.

    Supported properties of the column objects include:

      * `key` - Used to link a column to an attribute in a Model.
      * `name` - Used for columns that don't relate to an attribute in the Model
        (`formatter` or `nodeFormatter` only) if the implementer wants a
        predictable name to refer to in their CSS.
      * `cellTemplate` - Overrides the instance's `CELL_TEMPLATE` for cells in
        this column only.
      * `formatter` - Used to customize or override the content value from the
        Model.  These do not have access to the cell or row Nodes and should
        return string (HTML) content.
      * `nodeFormatter` - Used to provide content for a cell as well as perform
        any custom modifications on the cell or row Node that could not be
        performed by `formatter`s.  Should be used sparingly for better
        performance.
      * `emptyCellValue` - String (HTML) value to use if the Model data for a
        column, or the content generated by a `formatter`, is the empty string,
        `null`, or `undefined`.
      * `allowHTML` - Set to `true` if a column value, `formatter`, or
        `emptyCellValue` can contain HTML.  This defaults to `false` to protect
        against XSS.
      * `className` - Space delimited CSS classes to add to all `<td>`s in a
        column.

    Column `formatter`s are passed an object (`o`) with the following
    properties:

      * `value` - The current value of the column's associated attribute, if
        any.
      * `data` - An object map of Model keys to their current values.
      * `record` - The Model instance.
      * `column` - The column configuration object for the current column.
      * `className` - Initially empty string to allow `formatter`s to add CSS 
        classes to the cell's `<td>`.
      * `rowIndex` - The zero-based row number.
      * `rowClass` - Initially empty string to allow `formatter`s to add CSS
        classes to the cell's containing row `<tr>`.

    They may return a value or update `o.value` to assign specific HTML
    content.  A returned value has higher precedence.

    Column `nodeFormatter`s are passed an object (`o`) with the following
    properties:

      * `value` - The current value of the column's associated attribute, if
        any.
      * `td` - The `<td>` Node instance.
      * `cell` - The `<div>` liner Node instance if present, otherwise, the
        `<td>`.  When adding content to the cell, prefer appending into this
        property.
      * `data` - An object map of Model keys to their current values.
      * `record` - The Model instance.
      * `column` - The column configuration object for the current column.
      * `rowIndex` - The zero-based row number.

    They are expected to inject content into the cell's Node directly, including
    any "empty" cell content.  Each `nodeFormatter` will have access through the
    Node API to all cells and rows in the `<tbody>`, but not to the `<table>`,
    as it will not be attached yet.

    If a `nodeFormatter` returns `false`, the `o.td` and `o.cell` Nodes will be
    `destroy()`ed to remove them from the Node cache and free up memory.  The
    DOM elements will remain as will any content added to them.  _It is highly
    advisable to always return `false` from your `nodeFormatter`s_.

    @method render
    @return {BodyView} The instance
    @chainable
    @since 3.5.0
    **/
    render: function () {
        var tbody   = this.get('container'),
            data    = this.get('modelList'),
            columns = this.columns;

        // Needed for mutation
        this._createRowTemplate(columns);

        if (tbody && data) {
            tbody.setContent(this._createDataHTML(columns));

            this._applyNodeFormatters(tbody, columns);
        }

        this.bindUI();

        return this;
    },

    // -- Protected and private methods ---------------------------------------
    /**
    Handles changes in the source's columns attribute.  Redraws the table data.

    @method _afterColumnsChange
    @param {EventFacade} e The `columnsChange` event object
    @protected
    @since 3.5.0
    **/
    // TODO: Preserve existing DOM
    // This will involve parsing and comparing the old and new column configs
    // and reacting to four types of changes:
    // 1. formatter, nodeFormatter, emptyCellValue changes
    // 2. column deletions
    // 3. column additions
    // 4. column moves (preserve cells)
    _afterColumnsChange: function (e) {
        this.columns = this._parseColumns(e.newVal);

        this.render();
    },

    /**
    Handles modelList changes, including additions, deletions, and updates.

    Modifies the existing table DOM accordingly.

    @method _afterDataChange
    @param {EventFacade} e The `change` event from the ModelList
    @protected
    @since 3.5.0
    **/
    _afterDataChange: function (e) {
        // Baseline view will just rerender the tbody entirely
        this.render();
    },

    /**
    Reacts to a change in the instance's `modelList` attribute by breaking
    down the bubbling relationship with the previous `modelList` and setting up
    that relationship with the new one.

    @method _afterModelListChange
    @param {EventFacade} e The `modelListChange` event
    @protected
    @since 3.5.0
    **/
    _afterModelListChange: function (e) {
        var old = e.prevVal,
            now = e.newVal;

        if (old && old.removeTarget) {
            old.removeTarget(this);
        }

        if (now && now.addTarget(this)) {
            now.addTarget(this);
        }

        this._idMap = {};
    },

    /**
    Iterates the `modelList`, and calls any `nodeFormatter`s found in the
    `columns` param on the appropriate cell Nodes in the `tbody`.

    @method _applyNodeFormatters
    @param {Node} tbody The `<tbody>` Node whose columns to update
    @param {Object[]} columns The column configurations
    @protected
    @since 3.5.0
    **/
    _applyNodeFormatters: function (tbody, columns) {
        var source = this.source,
            data = this.get('modelList'),
            formatters = [],
            linerQuery = '.' + this.getClassName('liner'),
            rows, i, len;

        // Only iterate the ModelList again if there are nodeFormatters
        for (i = 0, len = columns.length; i < len; ++i) {
            if (columns[i].nodeFormatter) {
                formatters.push(i);
            }
        }

        if (data && formatters.length) {
            rows = tbody.get('childNodes');

            data.each(function (record, index) {
                var formatterData = {
                        data      : record.toJSON(),
                        record    : record,
                        rowIndex  : index
                    },
                    row = rows.item(index),
                    i, len, col, key, cells, cell, keep;


                if (row) {
                    cells = row.get('childNodes');
                    for (i = 0, len = formatters.length; i < len; ++i) {
                        cell = cells.item(formatters[i]);

                        if (cell) {
                            col = formatterData.column = columns[formatters[i]];
                            key = col.key || col.id;

                            formatterData.value = record.get(key);
                            formatterData.td    = cell;
                            formatterData.cell  = cell.one(linerQuery) || cell;

                            keep = col.nodeFormatter.call(source,formatterData);

                            if (keep === false) {
                                // Remove from the Node cache to reduce
                                // memory footprint.  This also purges events,
                                // which you shouldn't be scoping to a cell
                                // anyway.  You've been warned.  Incidentally,
                                // you should always return false. Just sayin.
                                cell.destroy(true);
                            }
                        }
                    }
                }
            });
        }
    },

    /**
    Binds event subscriptions from the UI and the source (if assigned).

    @method bindUI
    @protected
    @since 3.5.0
    **/
    bindUI: function () {
        var handles = this._eventHandles;

        if (this.source && !handles.columnsChange) {
            handles.columnsChange = this.source.after('columnsChange',
                bind('_afterColumnsChange', this));
        }

        if (!handles.dataChange) {
            handles.dataChange = this.after(
                ['modelListChange', '*:change', '*:add', '*:remove', '*:reset'],
                bind('_afterDataChange', this));
        }
    },

    /**
    The base token for classes created with the `getClassName` method.

    @property _cssPrefix
    @type {String}
    @default 'yui3-table'
    @protected
    @since 3.5.0
    **/
    _cssPrefix: ClassNameManager.getClassName('table'),

    /**
    Iterates the `modelList` and applies each Model to the `_rowTemplate`,
    allowing any column `formatter` or `emptyCellValue` to override cell
    content for the appropriate column.  The aggregated HTML string is
    returned.

    @method _createDataHTML
    @param {Object[]} columns The column configurations to customize the
                generated cell content or class names
    @return {HTML} The markup for all Models in the `modelList`, each applied
                to the `_rowTemplate`
    @protected
    @since 3.5.0
    **/
    _createDataHTML: function (columns) {
        var data = this.get('modelList'),
            html = '';

        if (data) {
            data.each(function (model, index) {
                html += this._createRowHTML(model, index);
            }, this);
        }

        return html;
    },

    /**
    Applies the data of a given Model, modified by any column formatters and
    supplemented by other template values to the instance's `_rowTemplate` (see
    `_createRowTemplate`).  The generated string is then returned.

    The data from Model's attributes is fetched by `toJSON` and this data
    object is appended with other properties to supply values to {placeholders}
    in the template.  For a template generated from a Model with 'foo' and 'bar'
    attributes, the data object would end up with the following properties
    before being used to populate the `_rowTemplate`:

      * `clientID` - From Model, used the assign the `<tr>`'s 'id' attribute.
      * `foo` - The value to populate the 'foo' column cell content.  This
        value will be the value stored in the Model's `foo` attribute, or the
        result of the column's `formatter` if assigned.  If the value is '', 
        `null`, or `undefined`, and the column's `emptyCellValue` is assigned,
        that value will be used.
      * `bar` - Same for the 'bar' column cell content.
      * `foo-className` - String of CSS classes to apply to the `<td>`.
      * `bar-className` - Same.
      * `rowClass`      - String of CSS classes to apply to the `<tr>`. This
        will be the odd/even class per the specified index plus any additional
        classes assigned by column formatters (via `o.rowClass`).

    Because this object is available to formatters, any additional properties
    can be added to fill in custom {placeholders} in the `_rowTemplate`.

    @method _createRowHTML
    @param {Model} model The Model instance to apply to the row template
    @param {Number} index The index the row will be appearing
    @return {HTML} The markup for the provided Model, less any `nodeFormatter`s
    @protected
    @since 3.5.0
    **/
    _createRowHTML: function (model, index) {
        var data     = model.toJSON(),
            clientId = model.get('clientId'),
            values   = {
                rowId   : this._getRowId(clientId),
                clientId: clientId,
                rowClass: (index % 2) ? this.CLASS_ODD : this.CLASS_EVEN
            },
            source  = this.source || this,
            columns = this.columns,
            i, len, col, token, value, formatterData;

        for (i = 0, len = columns.length; i < len; ++i) {
            col   = columns[i];
            value = data[col.key];
            token = col._id;

            values[token + '-className'] = '';

            if (col.formatter) {
                formatterData = {
                    value    : value,
                    data     : data,
                    column   : col,
                    record   : model,
                    className: '',
                    rowClass : '',
                    rowIndex : index
                };

                if (typeof col.formatter === 'string') {
                    if (value !== undefined) {
                        // TODO: look for known formatters by string name
                        value = fromTemplate(col.formatter, formatterData);
                    }
                } else {
                    // Formatters can either return a value
                    value = col.formatter.call(source, formatterData);

                    // or update the value property of the data obj passed
                    if (value === undefined) {
                        value = formatterData.value;
                    }

                    values[token + '-className'] = formatterData.className;
                    values.rowClass += ' ' + formatterData.rowClass;
                }
            }

            if (value === undefined || value === null || value === '') {
                value = col.emptyCellValue || '';
            }

            values[token] = col.allowHTML ? value : htmlEscape(value);

            values.rowClass = values.rowClass.replace(/\s+/g, ' ');
        }

        return fromTemplate(this._rowTemplate, values);
    },

    /**
    Creates a custom HTML template string for use in generating the markup for
    individual table rows with {placeholder}s to capture data from the Models
    in the `modelList` attribute or from column `formatter`s.

    Assigns the `_rowTemplate` property.

    @method _createRowTemplate
    @param {Object[]} columns Array of column configuration objects
    @protected
    @since 3.5.0
    **/
    _createRowTemplate: function (columns) {
        var html         = '',
            cellTemplate = this.CELL_TEMPLATE,
            i, len, col, key, token, headers, tokenValues;

        for (i = 0, len = columns.length; i < len; ++i) {
            col     = columns[i];
            key     = col.key;
            token   = col._id;
            // Only include headers if there are more than one
            headers = (col._headers || []).length > 1 ?
                        'headers="' + col._headers.join(' ') + '"' : '';

            tokenValues = {
                content  : '{' + token + '}',
                headers  : headers,
                className: this.getClassName('col', token) + ' ' +
                           (col.className || '') + ' ' +
                           this.getClassName('cell') +
                           ' {' + token + '-className}'
            };

            if (col.nodeFormatter) {
                // Defer all node decoration to the formatter
                tokenValues.content = '';
            }

            html += fromTemplate(col.cellTemplate || cellTemplate, tokenValues);
        }

        this._rowTemplate = fromTemplate(this.ROW_TEMPLATE, {
            content: html
        });
    },

    /**
    Destroys the instance.

    @method destructor
    @protected
    @since 3.5.0
    **/
    destructor: function () {
        // will unbind the bubble relationship and clear the table if necessary
        this.set('modelList', null);

        (new Y.EventHandle(YObject.values(this._eventHandles))).detach();
    },

    /**
    Holds the event subscriptions needing to be detached when the instance is
    `destroy()`ed.

    @property _eventHandles
    @type {Object}
    @default undefined (initially unset)
    @protected
    @since 3.5.0
    **/
    //_eventHandles: null,

    /**
    Returns the row ID associated with a Model's clientId.

    @method _getRowId
    @param {String} clientId The Model clientId
    @return {String}
    @protected
    **/
    _getRowId: function (clientId) {
        return this._idMap[clientId] || (this._idMap[clientId] = Y.guid());
    },

    /**
    Map of Model clientIds to row ids.

    @property _idMap
    @type {Object}
    @protected
    **/
    //_idMap,

    /**
    Initializes the instance. Reads the following configuration properties in
    addition to the instance attributes:

      * `columns` - (REQUIRED) The initial column information
      * `cssPrefix` - The base string for classes generated by `getClassName`
      * `source` - The object to serve as source of truth for column info

    @method initializer
    @param {Object} config Configuration data
    @protected
    @since 3.5.0
    **/
    initializer: function (config) {
        var cssPrefix = config.cssPrefix || (config.source || {}).cssPrefix,
            modelList = this.get('modelList');

        this.source  = config.source;
        this.columns = this._parseColumns(config.columns);

        this._eventHandles = {};
        this._idMap = {};

        if (cssPrefix) {
            this._cssPrefix = cssPrefix;
        }

        this.CLASS_ODD  = this.getClassName('odd');
        this.CLASS_EVEN = this.getClassName('even');

        this.after('modelListChange', bind('_afterModelListChange', this));

        if (modelList && modelList.addTarget) {
            modelList.addTarget(this);
        }
    },

    /**
    Flattens an array of potentially nested column configurations into a single
    depth array of data columns.  Columns that have children are disregarded in
    favor of searching their child columns.  The resulting array corresponds 1:1
    with columns that will contain data in the `<tbody>`.

    @method _parseColumns
    @param {Object[]} data Array of unfiltered column configuration objects
    @param {Object[]} columns Working array of data columns. Used for recursion.
    @return {Object[]} Only those columns that will be rendered.
    @protected
    @since 3.5.0
    **/
    _parseColumns: function (data, columns) {
        var col, i, len;
        
        columns || (columns = []);

        if (isArray(data) && data.length) {
            for (i = 0, len = data.length; i < len; ++i) {
                col = data[i];

                if (typeof col === 'string') {
                    col = { key: col };
                }

                if (col.key || col.formatter || col.nodeFormatter) {
                    col.index = columns.length;
                    columns.push(col);
                } else if (col.children) {
                    this._parseColumns(col.children, columns);
                }
            }
        }

        return columns;
    }

    /**
    The HTML template used to create a full row of markup for a single Model in
    the `modelList` plus any customizations defined in the column
    configurations.

    @property _rowTemplate
    @type {HTML}
    @default (initially unset)
    @protected
    @since 3.5.0
    **/
    //_rowTemplate: null
}, {
    ATTRS: {
        modelList: {
            setter: '_setModelList'
        }
    }
});


}, '@VERSION@' ,{requires:['datatable-core', 'view', 'classnamemanager']});
