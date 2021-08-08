
/*
Copyright - 2017 2021 - wwwouaiebe - Contact: https://www.ouaie.be/

This  program is free software;
you can redistribute it and/or modify it under the terms of the
GNU General Public License as published by the Free Software Foundation;
either version 3 of the License, or any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*/

/*
Changes:
	- v3.0.0:
		- Issue ♯175 : Private and static fields and methods are coming
Doc reviewed 20210725
Tests ...
*/

/**
@------------------------------------------------------------------------------------------------------------------------------

@file PaneUI.js
@copyright Copyright - 2017 2021 - wwwouaiebe - Contact: https://www.ouaie.be/
@license GNU General Public License
@private

@------------------------------------------------------------------------------------------------------------------------------
*/

/**
@------------------------------------------------------------------------------------------------------------------------------

@module PaneUI
@private

@------------------------------------------------------------------------------------------------------------------------------
*/

import { PANE_ID } from '../util/Constants.js';

/**
@--------------------------------------------------------------------------------------------------------------------------

@class PaneUI
@classdesc Base class for panes
@see {@link PanesManagerUI} for pane UI management
@hideconstructor

@--------------------------------------------------------------------------------------------------------------------------
*/

class PaneUI {

	constructor ( ) {
		this.paneDataDiv = null;
		this.paneControlDiv = null;
	}

	remove ( ) {
	}

	add ( ) {
	}

	getPaneId ( ) {
		return PANE_ID.invalidPane;
	}

	getButtonText ( ) {
		return '';
	}

	setPaneDivs ( paneDataDiv, paneControlDiv ) {
		this.paneDataDiv = paneDataDiv;
		this.paneControlDiv = paneControlDiv;
	}
}

export default PaneUI;