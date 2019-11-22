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
--- NoteEditor.js file ------------------------------------------------------------------------------------------------
This file contains:
	- the newNoteEditor function
	- the g_NoteEditor object
Changes:
	- v1.0.0:
		- created
	- v1.4.0:
		- Replacing DataManager with TravelNotesData, Config, Version and DataSearchEngine
		- added newSearchNote method and modified endNoteDialog for update of the travel note pane
		- added attachNoteToRoute and detachNoteFromRoute methods
	- v1.5.0:
		- Issue #52 : when saving the travel to the file, save also the edited route.
	- v1.6.0:
		- Issue #65 : Time to go to ES6 modules?
Doc reviewed 20191121
Tests ...

-----------------------------------------------------------------------------------------------------------------------
*/

/* global L */

export { g_NoteEditor };

import { g_Translator } from '../UI/Translator.js';
import { g_TravelNotesData } from '../data/TravelNotesData.js';
import { g_MapEditor } from '../core/MapEditor.js';
import { g_RouteEditor } from '../core/RouteEditor.js';
import { g_TravelEditor } from '../core/TravelEditor.js';

import { newDataPanesUI } from '../UI/DataPanesUI.js';
import { newNoteDialog } from '../UI/NoteDialog.js';
import { newUtilities } from '../util/Utilities.js';
import { newNote } from '../data/Note.js';
import { newDataSearchEngine } from '../data/DataSearchEngine.js';

/*
--- newNoteEditor function --------------------------------------------------------------------------------------------

Patterns : Closure and Singleton

-----------------------------------------------------------------------------------------------------------------------
*/

function newNoteEditor ( ) {
	
	let m_DataSearchEngine  = newDataSearchEngine ( );

	/*
	--- m_AttachNoteToRoute function ----------------------------------------------------------------------------------

	This function transform a travel note into a route note ( when possible )
	
	parameters:
	- noteObjId : the objId of the note to transform

	-------------------------------------------------------------------------------------------------------------------
	*/

	function m_AttachNoteToRoute ( noteObjId ) {
		let noteAndRoute = m_DataSearchEngine.getNoteAndRoute ( noteObjId );
		let distance = Number.MAX_VALUE;
		let selectedRoute = null;
		let newNoteLatLng = null;
		let newNoteDistance = null;

		g_TravelNotesData.travel.routes.forEach ( 
			route => {
				let pointAndDistance = g_RouteEditor.getClosestLatLngDistance ( route, noteAndRoute.note.latLng );
				if ( pointAndDistance ) {
					let distanceToRoute = L.latLng ( noteAndRoute.note.latLng ).distanceTo ( L.latLng ( pointAndDistance.latLng ) );
					if ( distanceToRoute < distance ) {
						distance = distanceToRoute;
						selectedRoute = route;
						newNoteLatLng = pointAndDistance.latLng;
						newNoteDistance = pointAndDistance.distance;
					}
				}
			}
		);
		
		if ( selectedRoute ) {
			g_TravelNotesData.travel.notes.remove (  noteObjId );
			noteAndRoute.note.distance = newNoteDistance;
			noteAndRoute.note.latLng = newNoteLatLng;
			noteAndRoute.note.chainedDistance = selectedRoute.chainedDistance;

			// ... the chainedDistance is adapted...
			selectedRoute.notes.add ( noteAndRoute.note );
			// and the notes sorted
			selectedRoute.notes.sort ( ( a, b ) => { return a.distance - b.distance; } );

			g_MapEditor.redrawNote ( noteAndRoute.note );
			newDataPanesUI ( ).updateItinerary ( );
			newDataPanesUI ( ).updateTravelNotes ( );
			// and the HTML page is adapted
			g_TravelEditor.updateRoadBook ( );
		}
	}

	/*
	--- m_DetachNoteFromRoute function --------------------------------------------------------------------------------

	This function transform a route note into a travel note
	
	parameters:
	- noteObjId : the objId of the note to transform

	-------------------------------------------------------------------------------------------------------------------
	*/

	function m_DetachNoteFromRoute ( noteObjId ) {
		// the note and the route are searched
		let noteAndRoute = m_DataSearchEngine.getNoteAndRoute ( noteObjId );
		noteAndRoute.route.notes.remove ( noteObjId );
		noteAndRoute.note.distance = -1;
		noteAndRoute.note.chainedDistance = 0;
		g_TravelNotesData.travel.notes.add ( noteAndRoute.note );
		
		newDataPanesUI ( ).updateItinerary ( );
		newDataPanesUI ( ).updateTravelNotes ( );
		// and the HTML page is adapted
		g_TravelEditor.updateRoadBook ( );
	}

	/*
	--- m_NewNote function --------------------------------------------------------------------------------------------

	This function create a new TravelNotes note object
	
	parameters:
	- latLng : the coordinates of the new note

	-------------------------------------------------------------------------------------------------------------------
	*/

	function m_NewNote ( latLng ) {
		let note = newNote ( );
		note.latLng = latLng;
		note.iconLatLng = latLng;
		
		return note;
	}
	
	/*
	--- m_NewRouteNote function ---------------------------------------------------------------------------------------

	This function start the creation of a TravelNotes note object linked with a route
	
	parameters:
	- routeObjId : the objId of the route to witch the note will be linked
	- event : the event that have triggered the method ( a right click on the 
	route polyline and then a choice in a context menu)

	-------------------------------------------------------------------------------------------------------------------
	*/

	function m_NewRouteNote ( routeObjId, event ) {
		// the nearest point and distance on the route is searched
		let latLngDistance = g_RouteEditor.getClosestLatLngDistance ( 
			m_DataSearchEngine.getRoute ( routeObjId ),
			[ event.latlng.lat, event.latlng.lng ] 
		);
		
		// the note is created
		let note = m_NewNote ( latLngDistance.latLng );
		note.distance = latLngDistance.distance;
		
		// and displayed in a dialog box
		newNoteDialog ( note, routeObjId, true );
	}
	
	/*
	--- m_NewSearchNote function --------------------------------------------------------------------------------------

	This function start the creation of a TravelNotes note object linked to a search
	
	parameters:
	- searchResult : the search results with witch the note will be created

	-------------------------------------------------------------------------------------------------------------------
	*/

	function m_NewSearchNote ( searchResult ) {
		let note = m_NewNote ( [ searchResult.lat, searchResult.lon ] );
		
		note.address = ( searchResult.tags [ 'addr:housenumber' ] ? searchResult.tags [ 'addr:housenumber' ] + ' ' : '' ) +
			( searchResult.tags [ 'addr:street' ] ? searchResult.tags [ 'addr:street' ] + ' ' : '' ) +
			( searchResult.tags [ 'addr:city' ] ? searchResult.tags [ 'addr:city' ] + ' ' : '' );
		
		note.url = searchResult.tags.website || '';
		note.phone = searchResult.tags.phone || '';
		note.tooltipContent = searchResult.tags.name || '';
		note.popupContent = searchResult.tags.name || '';
		
		newNoteDialog ( note, -1, true );
	}
	
	/*
	--- m_NewManeuverNote function ------------------------------------------------------------------------------------

	This function start the creation of a TravelNotes note object linked to a maneuver
	
	parameters:
	- maneuverObjId : the objId of the maneuver
	- latLng : the coordinates of the maneuver

	-------------------------------------------------------------------------------------------------------------------
	*/

	function m_NewManeuverNote ( maneuverObjId, latLng ) {
		// the nearest point and distance on the route is searched
		let latLngDistance = g_RouteEditor.getClosestLatLngDistance ( 
			g_TravelNotesData.travel.editedRoute,
			latLng
		);
		// the maneuver is searched
		let maneuver = g_TravelNotesData.travel.editedRoute.itinerary.maneuvers.getAt ( maneuverObjId );

		// the note is created
		let note = m_NewNote ( latLng );
		note.distance = latLngDistance.distance;
		note.iconContent = "<div class='TravelNotes-ManeuverNote TravelNotes-ManeuverNote-" + maneuver.iconName + "'></div>";
		note.popupContent = maneuver.instruction;
		note.iconWidth = 40;
		note.iconHeight = 40;

		// and displayed in a dialog box
		newNoteDialog ( note, g_TravelNotesData.travel.editedRoute.objId, true );
	}

	/*
	--- m_NewTravelNote function --------------------------------------------------------------------------------------

	This function start the creation f a TravelNotes note object
	
	parameters:
	- latLng : the coordinates of the new note

	-------------------------------------------------------------------------------------------------------------------
	*/

	function m_NewTravelNote ( latLng ) {
		// the note is created
		let note = m_NewNote ( latLng );

		// and displayed in a dialog box
		newNoteDialog ( note, -1, true );
	}

	/*
	--- m_AfterNoteDialog function ------------------------------------------------------------------------------------

	This function is called when the user push on the ok button of the note dialog
	
	parameters:
	- note : the note modified in the dialog box
	- routeObjId : the TravelNotes route objId passed to the note dialog box

	-------------------------------------------------------------------------------------------------------------------
	*/

	function m_AfterNoteDialog ( note, routeObjId ) {
		let noteAndRoute = m_DataSearchEngine.getNoteAndRoute ( note.objId );
		if ( noteAndRoute.note ) {
			// it's an existing note. The note is changed on the map
			g_MapEditor.redrawNote ( note );
			if ( ! noteAndRoute.route ) {
				// it's a travel note. UI is also adapted
				newDataPanesUI ( ).setTravelNotes ( );
			}
			else {
				newDataPanesUI ( ).setItinerary ( );
			}
		}
		else {
			// it's a new note
			if ( -1 === routeObjId ) {
				// it's a global note
				g_TravelNotesData.travel.notes.add ( note );
				newDataPanesUI ( ).setTravelNotes ( );
			}
			else {
				// the note is linked with a route, so...
				let route = m_DataSearchEngine.getRoute ( routeObjId );
				route.notes.add ( note );
				// ... the chainedDistance is adapted...
				note.chainedDistance = route.chainedDistance;
				// and the notes sorted
				route.notes.sort ( ( a, b ) => { return a.distance - b.distance; } );
				// and in the itinerary is adapted...
				newDataPanesUI ( ).setItinerary ( );
			}
			// the note is added to the leaflet map
			g_MapEditor.addNote ( note );
		}
		// and the HTML page is adapted
		g_TravelEditor.updateRoadBook ( );
	}
	
	/*
	--- m_EditNote function -------------------------------------------------------------------------------------------

	This function start the modification of a note
	
	parameters:
	- noteObjId : the objId of the edited note

	-------------------------------------------------------------------------------------------------------------------
	*/

	function m_EditNote ( noteObjId ) {
		let noteAndRoute = m_DataSearchEngine.getNoteAndRoute ( noteObjId );
		newNoteDialog ( noteAndRoute.note, null === noteAndRoute.route ? -1 : noteAndRoute.route.objId, false );
	}

	/*
	--- m_RemoveNote function -----------------------------------------------------------------------------------------

	This function removes a note
	
	parameters:
	- noteObjId : the objId of the note to remove

	-------------------------------------------------------------------------------------------------------------------
	*/

	function m_RemoveNote ( noteObjId ) {
		// the note is removed from the leaflet map
		g_MapEditor.removeObject ( noteObjId );
		// the note and the route are searched
		let noteAndRoute = m_DataSearchEngine.getNoteAndRoute ( noteObjId );
		if ( noteAndRoute.route ) {
			// it's a route note
			noteAndRoute.route.notes.remove ( noteObjId );
			newDataPanesUI ( ).updateItinerary ( );
		}
		else {
			// it's a travel note
			g_TravelNotesData.travel.notes.remove ( noteObjId );
			newDataPanesUI ( ).updateTravelNotes( );
		}
		// and the HTML page is adapted
		g_TravelEditor.updateRoadBook ( );
	}
	
	/*
	--- m_HideNotes function ------------------------------------------------------------------------------------------

	This function hide the notes on the map
	
	-------------------------------------------------------------------------------------------------------------------
	*/

	function m_HideNotes ( ) {
		let notesIterator = g_TravelNotesData.travel.notes.iterator;
		while ( ! notesIterator.done ) {
			g_MapEditor.removeObject ( notesIterator.value.objId );
		}
		let routesIterator = g_TravelNotesData.travel.routes.iterator;
		while ( ! routesIterator.done ) {
			notesIterator = routesIterator.value.notes.iterator;
			while ( ! notesIterator.done ) {
				g_MapEditor.removeObject ( notesIterator.value.objId );					
			}
		}
	}
		
	/*
	--- m_ShowNotes function ------------------------------------------------------------------------------------------

	This function show the notes on the map
	
	-------------------------------------------------------------------------------------------------------------------
	*/

	function m_ShowNotes ( ) {
		m_HideNotes ( );
		let notesIterator = g_TravelNotesData.travel.notes.iterator;
		while ( ! notesIterator.done ) {
			g_MapEditor.addNote ( notesIterator.value );
		}
		let routesIterator = g_TravelNotesData.travel.routes.iterator;
		while ( ! routesIterator.done ) {
			notesIterator = routesIterator.value.notes.iterator;
			while ( ! notesIterator.done ) {
				g_MapEditor.addNote ( notesIterator.value );					
			}
		}
	}
		
	/*
	--- m_ZoomToNote function -----------------------------------------------------------------------------------------

	This function zoom to a given note
	
	-------------------------------------------------------------------------------------------------------------------
	*/

	function m_ZoomToNote ( noteObjId ) {
		g_MapEditor.zoomToPoint ( m_DataSearchEngine.getNoteAndRoute ( noteObjId).note.latLng );
	}
	
	/*
	--- m_NoteDropped function ----------------------------------------------------------------------------------------

	This function changes the position of a note after a drag and drop
	
	-------------------------------------------------------------------------------------------------------------------
	*/

	function m_NoteDropped (  draggedNoteObjId, targetNoteObjId, draggedBefore ) {
		g_TravelNotesData.travel.notes.moveTo ( draggedNoteObjId, targetNoteObjId, draggedBefore );
		newDataPanesUI ( ).updateTravelNotes( );
		g_TravelEditor.updateRoadBook ( );
	}
		
	/*
	--- m_GetNoteHTML function ----------------------------------------------------------------------------------------

	This function returns an HTML string with the note contents. This string will be used in the
	note popup and on the roadbook page
	
	parameters:
	- note : the TravelNotes object
	- classNamePrefix : a string that will be added to all the HTML classes

	-------------------------------------------------------------------------------------------------------------------
	*/

	function m_GetNoteHTML ( note, classNamePrefix ) {
	
		let noteText = '';
		if ( 0 !== note.tooltipContent.length ) {
			noteText += '<div class="' + classNamePrefix + 'NoteHtml-TooltipContent">' + note.tooltipContent + '</div>';
		}
		if ( 0 !== note.popupContent.length ) {
			noteText += '<div class="' + classNamePrefix + 'NoteHtml-PopupContent">' + note.popupContent + '</div>';
		}
		if ( 0 !== note.address.length ) {
			noteText += '<div class="' + classNamePrefix + 'NoteHtml-Address">' + g_Translator.getText ( 'NoteEditor - Address' )  + note.address + '</div>';
		}
		if ( 0 !== note.phone.length ) {
			noteText += '<div class="' + classNamePrefix + 'NoteHtml-Phone">' + g_Translator.getText ( 'NoteEditor - Phone' )  + note.phone + '</div>';
		}
		if ( 0 !== note.url.length ) {
			noteText += '<div class="' + classNamePrefix + 'NoteHtml-Url">' + g_Translator.getText ( 'NoteEditor - Link' ) + '<a href="' + note.url + '" target="_blank">' + note.url.substr ( 0, 40 ) + '...' +'</a></div>';
		}
		let utilities = newUtilities ( );
		noteText += '<div class="' + classNamePrefix + 'NoteHtml-LatLng">' + 
			g_Translator.getText ( 
				'NoteEditor - Latitude Longitude',
				{ 
					lat : utilities.formatLat ( note.lat ),
					lng : utilities.formatLng ( note.lng )
				}
			) + '</div>';
			
		if ( -1 !== note.distance ) {
			noteText += '<div class="' + classNamePrefix + 'NoteHtml-Distance">' +
				g_Translator.getText ( 
					'NoteEditor - Distance', 
					{ 
						distance: utilities.formatDistance ( note.chainedDistance + note.distance )
					}
				) + '</div>';
		}
		
		return noteText;
	}
			
	/*
	--- noteEditor object ---------------------------------------------------------------------------------------------

	-------------------------------------------------------------------------------------------------------------------
	*/

	return Object.seal (
		{	
		
			newRouteNote : ( routeObjId, event ) => m_NewRouteNote ( routeObjId, event ),
			
			newSearchNote : searchResult => m_NewSearchNote ( searchResult ),
		
			newManeuverNote : ( maneuverObjId, latLng ) => m_NewManeuverNote ( maneuverObjId, latLng ),
		
			newTravelNote : latLng => m_NewTravelNote ( latLng ),
		
			afterNoteDialog : ( note, routeObjId ) => m_AfterNoteDialog ( note, routeObjId ),	
		
			editNote : noteObjId =>	m_EditNote ( noteObjId ),
		
			removeNote : noteObjId => m_RemoveNote ( noteObjId ),
		
			hideNotes : ( ) => m_HideNotes ( ),
			
			showNotes : ( ) => m_ShowNotes ( ),
			
			zoomToNote : noteObjId => m_ZoomToNote ( noteObjId ),
						
			attachNoteToRoute : noteObjId => m_AttachNoteToRoute ( noteObjId ),
			
			detachNoteFromRoute : noteObjId => m_DetachNoteFromRoute ( noteObjId ),
			
			noteDropped : ( draggedNoteObjId, targetNoteObjId, draggedBefore ) => m_NoteDropped (  draggedNoteObjId, targetNoteObjId, draggedBefore ),
			
			getNoteHTML : ( note, classNamePrefix ) => { return m_GetNoteHTML ( note, classNamePrefix ); }		
		}
	);
}

/* 
--- g_NoteEditor object -----------------------------------------------------------------------------------------------

The one and only one noteEditor

-----------------------------------------------------------------------------------------------------------------------
*/

const g_NoteEditor = newNoteEditor ( );

/*
--- End of NoteEditor.js file -----------------------------------------------------------------------------------------
*/