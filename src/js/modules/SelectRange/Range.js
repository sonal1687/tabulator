import CoreFeature from '../../core/CoreFeature.js';
import RangeComponent from "./RangeComponent";

class Range extends CoreFeature{
	constructor(table, rangeManager, start, end) {
		super(table);
		
		this.rangeManager = rangeManager;
		this.element = null;
		this.initialized = false;
		this.initializing = {
			start:false,
			end:false,
		};
		this.destroyed = false;
		
		this.top = 0;
		this.bottom = 0;
		this.left = 0;
		this.right = 0;
		
		this.table = table;
		this.start = {row:0, col:0};
		this.end = {row:0, col:0};
		
		this.initElement();
		
		setTimeout(() => {
			this.initBounds(start, end);
		});
	}
	
	initElement(){
		this.element = document.createElement("div");
		this.element.classList.add("tabulator-range");
	}
	
	initBounds(start, end){
		this._updateMinMax();
		
		if(start){
			this.setBounds(start, end || start);
		}
	}
	
	///////////////////////////////////
	///////   Boundary Setup    ///////
	///////////////////////////////////
	
	setStart(row, col) {
		if(this.start.row !== row || this.start.col !== col){
			this.start.row = row;
			this.start.col = col;
			
			this.initializing.start = true;
			this._updateMinMax();
		}
	}
	
	setEnd(row, col) {
		if(this.end.row !== row || this.end.col !== col){
			this.end.row = row;
			this.end.col = col;
			
			this.initializing.end = true;
			this._updateMinMax();
		}
	}
	
	setBounds(start, end, visibleRows){
		if(start){
			this.setStartBound(start);
		}
		
		this.setEndBound(end || start);
		this.rangeManager.layoutElement(visibleRows);
	}
	
	setStartBound(element){
		var row, col;

		if (element.type === "column") {
			if(this.rangeManager.columnSelection){
				this.setStart(0, element.getPosition() - 2);
			}
		}else{
			row = element.row.position - 1;
			col = element.column.getPosition() - 2;
			
			if (element.column === this.rowHeader) {
				this.setStart(row, 0);
			} else {
				this.setStart(row, col);
			}
		}
	}
	
	setEndBound(element){
		var rowsCount = this._getTableRows().length,
		row, col, isRowHeader;
		
		if (element.type === "column") {
			if(this.rangeManager.columnSelection){
				if (this.rangeManager.selecting === "column") {
					this.setEnd(rowsCount - 1, element.getPosition() - 2);
				} else if (this.rangeManager.selecting === "cell") {
					this.setEnd(0, element.getPosition() - 2);
				}
			}
		}else{
			row = element.row.position - 1;
			col = element.column.getPosition() - 2;
			isRowHeader = element.column === this.rowHeader;
			
			if (this.rangeManager.selecting === "row") {
				this.setEnd(row, this._getTableColumns().length - 2);
			} else if (this.rangeManager.selecting !== "row" && isRowHeader) {
				this.setEnd(row, 0);
			} else if (this.rangeManager.selecting === "column") {
				this.setEnd(rowsCount - 1, col);
			} else {
				this.setEnd(row, col);
			}
		}
	}
	
	_updateMinMax() {
		this.top = Math.min(this.start.row, this.end.row);
		this.bottom = Math.max(this.start.row, this.end.row);
		this.left = Math.min(this.start.col, this.end.col);
		this.right = Math.max(this.start.col, this.end.col);
		
		if(this.initialized){
			this.dispatchExternal("rangeChanged", this.getComponent());
		}else{
			if(this.initializing.start && this.initializing.end){
				this.initialized = true;
				this.dispatchExternal("rangeAdded", this.getComponent());
			}
		}
	}
	
	_getTableColumns() {
		return this.table.columnManager.getVisibleColumnsByIndex();
	}
	
	_getTableRows() {
		return this.table.rowManager.getDisplayRows();
	}
	
	///////////////////////////////////
	///////      Rendering      ///////
	///////////////////////////////////
	
	layout() {
		var _vDomTop = this.table.rowManager.renderer.vDomTop,
		_vDomBottom = this.table.rowManager.renderer.vDomBottom,
		_vDomLeft = this.table.columnManager.renderer.leftCol,
		_vDomRight = this.table.columnManager.renderer.rightCol,		
		top, bottom, left, right, topLeftCell, bottomRightCell;
		
		if (_vDomTop == null) {
			_vDomTop = 0;
		}
		
		if (_vDomBottom == null) {
			_vDomBottom = Infinity;
		}
		
		if (_vDomLeft == null) {
			_vDomLeft = 0;
		}
		
		if (_vDomRight == null) {
			_vDomRight = Infinity;
		}
		
		if (this.overlaps(_vDomLeft, _vDomTop, _vDomRight, _vDomBottom)) {
			top = Math.max(this.top, _vDomTop);
			bottom = Math.min(this.bottom, _vDomBottom);
			left = Math.max(this.left, _vDomLeft);
			right = Math.min(this.right, _vDomRight);
			
			topLeftCell = this.rangeManager.getCell(top, left);
			bottomRightCell = this.rangeManager.getCell(bottom, right);
			
			this.element.classList.add("tabulator-range-active");
			// this.element.classList.toggle("tabulator-range-active", this === this.rangeManager.activeRange);
			
			this.element.style.left = topLeftCell.row.getElement().offsetLeft + topLeftCell.getElement().offsetLeft + "px";
			this.element.style.top = topLeftCell.row.getElement().offsetTop + "px";
			this.element.style.width = bottomRightCell.getElement().offsetLeft + bottomRightCell.getElement().offsetWidth - topLeftCell.getElement().offsetLeft + "px";
			this.element.style.height = bottomRightCell.row.getElement().offsetTop + bottomRightCell.row.getElement().offsetHeight - topLeftCell.row.getElement().offsetTop + "px";
		}
	}
	
	atTopLeft(cell) {
		return cell.row.position - 1 === this.top && cell.column.getPosition() - 2 === this.left;
	}
	
	atBottomRight(cell) {
		return cell.row.position - 1 === this.bottom && cell.column.getPosition() - 2 === this.right;
	}
	
	occupies(cell) {
		return this.occupiesRow(cell.row) && this.occupiesColumn(cell.column);
	}
	
	occupiesRow(row) {
		return this.top <= row.position - 1 && row.position - 1 <= this.bottom;
	}
	
	occupiesColumn(col) {
		return this.left <= col.getPosition() - 2 && col.getPosition() - 2 <= this.right;
	}
	
	overlaps(left, top, right, bottom) {
		if ((this.left > right || left > this.right) || (this.top > bottom || top > this.bottom)){
			return false;
		}
		
		return true;
	}
	
	getData() {
		var data = [],
		rows = this.getRows(),
		columns = this.getColumns();
		
		rows.forEach((row) => {
			var rowData = row.getData(),
			result = {};

			columns.forEach((column) => {
				result[column.field] = rowData[column.field];
			});

			data.push(result);
		});
		
		return data;
	}
	
	getCells(structured) {
		var cells = [],
		rows = this.getRows(),
		columns = this.getColumns();
		
		if (structured) {
			cells = rows.map((row) => {
				var arr = [];

				row.getCells().forEach((cell) => {
					if (columns.includes(cell.column)) {
						arr.push(cell.getComponent());
					}
				});

				return arr;
			});
		} else {
			rows.forEach((row) => {
				row.getCells().forEach((cell) => {
					if (columns.includes(cell.column)) {
						cells.push(cell.getComponent());
					}
				});
			});
		}
		
		return cells;
	}
	
	getStructuredCells() {
		return this.getCells(true);
	}
	
	getRows() {
		return this._getTableRows().slice(this.top, this.bottom + 1);
	}
	
	getColumns() {
		return this._getTableColumns().slice(this.left + 1, this.right + 2);
	}

	getBounds(){
		var cells = this.getCells(),
		output = {
			start:null,
			end:null,
		};

		if(cells.length){
			output.start = cells[0];
			output.end = cells[cells.length - 1];
		}else{
			console.warn("No bounds defined on range");
		}

		return output;
	}
	
	getComponent() {
		if (!this.component) {
			this.component = new RangeComponent(this);
		}
		return this.component;
	}
	
	destroy(notify) {
		this.destroyed = true;
		
		this.element.remove();

		if(notify){
			this.rangeManager.rangeRemoved(this);
		}

		if(this.initialized){
			this.dispatchExternal("rangeRemoved", this.getComponent());
		}
	}

	destroyedGuard(func){
		if(this.destroyed){
			console.warn("You cannot call the "  + func + " function on a destroyed range");
		}

		return !this.destroyed;
	}
}

export default Range;