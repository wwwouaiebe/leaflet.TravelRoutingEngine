/*
Copyright - 2017 - wwwouaiebe - Contact: http//www.ouaie.be/

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
--- SearchPaneUI.js file ----------------------------------------------------------------------------------------------
This file contains:
	-
Changes:
	- v1.4.0:
		- created
	- v1.6.0:
		- Issue #65 : Time to go to ES6 modules?
	- v1.12.0:
		- Issue #120 : Review the UserInterface
Doc reviewed 20191125
Tests ...

-----------------------------------------------------------------------------------------------------------------------
*/

import { theTranslator } from '../UI/Translator.js';
import { theTravelNotesData } from '../data/TravelNotesData.js';

import { theHTMLElementsFactory } from '../util/HTMLElementsFactory.js';
import { newObjId } from '../data/ObjId.js';
import { newOsmSearchEngine } from '../core/OsmSearchEngine.js';
import { newEventDispatcher } from '../util/EventDispatcher.js';
import { newOsmSearchContextMenu } from '../contextMenus/OsmSearchContextMenu.js';

import { LAT_LNG, ZERO } from '../util/Constants.js';

/*
--- newSearchPaneUI function ------------------------------------------------------------------------------------------

This function returns the searchPaneUI object

-----------------------------------------------------------------------------------------------------------------------
*/

function newSearchPaneUI ( ) {

	let myOsmSearchEngine = newOsmSearchEngine ( );
	let mySearchInputValue = '';

	let myEventDispatcher = newEventDispatcher ( );

	let myDataDiv = null;

	/*
	--- myOnSearchResultContextMenu function --------------------------------------------------------------------------

	contextmenu event listener for the search

	-------------------------------------------------------------------------------------------------------------------
	*/

	function myOnSearchResultContextMenu ( contextMenuEvent ) {
		contextMenuEvent.stopPropagation ( );
		contextMenuEvent.preventDefault ( );
		let element = contextMenuEvent.target;
		while ( ! element.latLng ) {
			element = element.parentNode;
		}

		contextMenuEvent.latlng = { lat : LAT_LNG.defaultValue, lng : LAT_LNG.defaultValue };
		contextMenuEvent.fromUI = true;
		contextMenuEvent.originalEvent =
			{
				clientX : contextMenuEvent.clientX,
				clientY : contextMenuEvent.clientY,
				latLng : element.latLng,
				searchResult : element.searchResult,
				geometry : element.geometry
			};
		newOsmSearchContextMenu ( contextMenuEvent, myDataDiv ).show ( );
	}

	/*
	--- myOnSearchResultMouseEnter function ---------------------------------------------------------------------------

	mouseenter event listener for the search

	-------------------------------------------------------------------------------------------------------------------
	*/

	function myOnSearchResultMouseEnter ( mouseEvent ) {
		mouseEvent.stopPropagation ( );
		myEventDispatcher.dispatch (
			'addsearchpointmarker',
			{
				objId : mouseEvent.target.objId,
				latLng : mouseEvent.target.latLng,
				geometry : mouseEvent.target.geometry
			}
		);
	}

	/*
	--- myOnSearchResultMouseLeave function ---------------------------------------------------------------------------

	mouseleave event listener for the search

	-------------------------------------------------------------------------------------------------------------------
	*/

	function myOnSearchResultMouseLeave ( mouseEvent ) {
		mouseEvent.stopPropagation ( );
		myEventDispatcher.dispatch ( 'removeobject', { objId : mouseEvent.target.objId } );
	}

	/*
	--- myOnSearchInputChange function --------------------------------------------------------------------------------

	change event listener for the search input

	-------------------------------------------------------------------------------------------------------------------
	*/

	function myOnSearchInputChange ( ) {

		// saving the search phrase
		mySearchInputValue = document.getElementById ( 'TravelNotes-SearchPaneUI-SearchInput' ).value;

		let searchDiv = document.getElementById ( 'TravelNotes-SearchPaneUI-SearchDiv' );

		// removing previous search results
		let searchResultsElements = document.getElementsByClassName ( 'TravelNotes-SearchPaneUI-SearchResult' );
		while ( ZERO !== searchResultsElements.length ) {

			// cannot use forEach because searchResultsElements is directly updated when removing an element!!!
			searchResultsElements [ ZERO ].removeEventListener ( 'contextmenu', myOnSearchResultContextMenu, false );
			searchResultsElements [ ZERO ].removeEventListener ( 'mouseenter', myOnSearchResultMouseEnter, false );
			searchResultsElements [ ZERO ].removeEventListener ( 'mouseleave', myOnSearchResultMouseLeave, false );
			searchDiv.removeChild ( searchResultsElements [ ZERO ] );
		}
		if ( ! document.getElementById ( 'TravelNotes-SearchPaneUI-SearchWaitBullet' ) ) {

			// adding wait animation
			theHTMLElementsFactory.create (
				'div',
				{
					id : 'TravelNotes-SearchPaneUI-SearchWaitBullet'
				},
				theHTMLElementsFactory.create (
					'div',
					{ id : 'TravelNotes-SearchPaneUI-SearchWait' },
					searchDiv
				)
			);
		}

		// search...
		myOsmSearchEngine.search ( mySearchInputValue );
	}

	/*
	--- myRemove function ---------------------------------------------------------------------------------------------

	This function removes the content

	-------------------------------------------------------------------------------------------------------------------
	*/

	function myRemove ( ) {

		myOsmSearchEngine.hide ( );

		let searchButton = document.getElementById ( 'TravelNotes-SearchPaneUI-SearchButton' );
		if ( searchButton ) {
			searchButton.removeEventListener ( 'click', myOnSearchInputChange, false );
		}

		let searchInputElement = document.getElementById ( 'TravelNotes-SearchPaneUI-SearchInput' );
		if ( searchInputElement ) {
			searchInputElement.removeEventListener ( 'change', myOnSearchInputChange, false );
		}
		let searchDiv = document.getElementById ( 'TravelNotes-SearchPaneUI-SearchDiv' );

		let searchResultsElements = document.getElementsByClassName ( 'TravelNotes-SearchPaneUI-SearchResult' );

		Array.prototype.forEach.call (
			searchResultsElements,
			searchResultsElement => {
				searchResultsElement.removeEventListener ( 'contextmenu', myOnSearchResultContextMenu, false );
				searchResultsElement.removeEventListener ( 'mouseenter', myOnSearchResultMouseEnter, false );
				searchResultsElement.removeEventListener ( 'mouseleave', myOnSearchResultMouseLeave, false );
			}
		);

		if ( searchDiv ) {
			myDataDiv.removeChild ( searchDiv );
		}
	}

	/*
	--- myAdd function ------------------------------------------------------------------------------------------------

	This function adds the content

	-------------------------------------------------------------------------------------------------------------------
	*/

	function myAdd ( ) {

		document.getElementById ( 'TravelNotes-DataPanesUI-ItineraryPaneButton' )
			.classList.remove ( 'TravelNotes-DataPaneUI-ActivePaneButton' );
		document.getElementById ( 'TravelNotes-DataPanesUI-TravelNotesPaneButton' )
			.classList.remove ( 'TravelNotes-DataPaneUI-ActivePaneButton' );
		document.getElementById ( 'TravelNotes-DataPaneUI-SearchPaneButton' )
			.classList.add ( 'TravelNotes-DataPaneUI-ActivePaneButton' );

		if ( ! myDataDiv ) {
			myDataDiv = document.getElementById ( 'TravelNotes-DataPanesUI-DataPanesDiv' );
		}

		myOsmSearchEngine.show ( );
		let searchDiv = theHTMLElementsFactory.create (
			'div',
			{
				id : 'TravelNotes-SearchPaneUI-SearchDiv'
			},
			myDataDiv
		);
		let searchButton = theHTMLElementsFactory.create (
			'div',
			{
				id : 'TravelNotes-SearchPaneUI-SearchButton',
				className : 'TravelNotes-UI-Button',
				title : theTranslator.getText ( 'SearchPaneUI - Search OpenStreetMap' ),
				innerHTML : '&#x1f50e'
			},
			searchDiv
		);
		searchButton.addEventListener ( 'click', myOnSearchInputChange, false );

		let searchInput = theHTMLElementsFactory.create (
			'input',
			{
				type : 'text',
				id : 'TravelNotes-SearchPaneUI-SearchInput',
				placeholder : theTranslator.getText ( 'SearchPaneUI - Search phrase' ),
				value : mySearchInputValue
			},
			searchDiv
		);
		searchInput.addEventListener ( 'change', myOnSearchInputChange, false );
		searchInput.addEventListener (
			'keydown',
			keyBoardEvent => {
				if ( 'Enter' === keyBoardEvent.key ) {
					myOnSearchInputChange ( keyBoardEvent );
				}
			},
			false );
		searchInput.focus ( );
		let resultsCounter = ZERO;
		theTravelNotesData.searchData.forEach (
			searchResult => {
				let searchResultDiv = theHTMLElementsFactory.create (
					'div',
					{
						id : 'TravelNotes-SearchPaneUI-SearchResult' + ( resultsCounter ++ ),
						className :	'TravelNotes-SearchPaneUI-SearchResult',
						innerHTML :
							(
								'' === searchResult.description
									?
									''
									:
									'<p>' +
									searchResult.description +
									'</p>'
							) +
							(
								searchResult.tags.name
									?
									'<p>' +
									searchResult.tags.name +
									'</p>'
									:
									''
							) +
							(
								searchResult.tags [ 'addr:street' ]
									?
									'<p>' +
									searchResult.tags [ 'addr:street' ] +
									' ' +
									(
										searchResult.tags [ 'addr:housenumber' ]
											?
											searchResult.tags [ 'addr:housenumber' ]
											:
											''
									) +
									'</p>'
									:
									''
							) +
							(
								searchResult.tags [ 'addr:city' ]
									?
									'<p>' +
									(
										searchResult.tags [ 'addr:postcode' ]
											?
											searchResult.tags [ 'addr:postcode' ] +
											' '
											:
											''
									) +
									searchResult.tags [ 'addr:city' ] +
									'</p>'
									:
									''
							) +
							(
								searchResult.tags.phone
									?
									'<p>' +
									searchResult.tags.phone +
									'</p>'
									:
									''
							) +
							(
								searchResult.tags.email
									?
									'<p><a href="mailto:' +
									searchResult.tags.email +
									'">' +
									searchResult.tags.email +
									'</a></p>'
									:
									''
							) +
							(
								searchResult.tags.website
									?
									'<p><a href="' +
									searchResult.tags.website +
									'" target="_blank">' +
									searchResult.tags.website +
									'</a></p>'
									:
									''
							) +
							(
								searchResult.ranking
									?
									'<p>&#x26ab;' +
									searchResult.ranking +
									'</p>'
									:
									''
							)
					},
					searchDiv
				);
				searchResultDiv.searchResult = searchResult;
				searchResultDiv.objId = newObjId ( );
				searchResultDiv.osmId = searchResult.id;
				searchResultDiv.latLng = [ searchResult.lat, searchResult.lon ];
				searchResultDiv.geometry = searchResult.geometry;
				searchResultDiv.addEventListener ( 'contextmenu', myOnSearchResultContextMenu, false );
				searchResultDiv.addEventListener ( 'mouseenter', myOnSearchResultMouseEnter, false );
				searchResultDiv.addEventListener ( 'mouseleave', myOnSearchResultMouseLeave, false );
			}
		);
	}

	/*
	--- SearchPaneUI object -------------------------------------------------------------------------------------------

	-------------------------------------------------------------------------------------------------------------------
	*/

	return Object.seal (
		{
			remove : ( ) => myRemove ( ),
			add : ( ) => myAdd ( )
		}
	);
}

export { newSearchPaneUI };

/*
--- End of SearchPaneUI.js file ---------------------------------------------------------------------------------------
*/