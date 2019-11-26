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
--- EventDispatcher.js file -------------------------------------------------------------------------------------------
This file contains:
	- the newEventDispatcher function
Changes:
	- v1.6.0:
		- created
Doc reviewed 20191125
Tests ...

-----------------------------------------------------------------------------------------------------------------------
*/

export { newEventDispatcher };

/*
--- newEventDispatcher function ---------------------------------------------------------------------------------------

This function returns the eventDispatcher object

-----------------------------------------------------------------------------------------------------------------------
*/

function newEventDispatcher ( ) {
	
	/*
	--- m_GetTarget function ------------------------------------------------------------------------------------------

	-------------------------------------------------------------------------------------------------------------------
	*/

	function m_GetTarget ( eventName ) {
		switch ( eventName ) {
			case 'setitinerary':
			case 'updateitinerary':
			case 'settravelnotes':
			case 'updatetravelnotes':
			case 'setsearch':
			case 'updatesearch':
			case 'expandrouteui':
			case 'reducerouteui':
			case 'setwaypointslist':
			case 'setrouteslist':
			case 'setprovider':
			case 'settransitmode':
				return document.getElementById ( 'TravelNotes-Control-MainDiv' );
			case 'removeroute':
			case 'addroute':
			case 'editroute':
			case 'removeobject':
			case 'removeallobjects':
			case 'zoomtopoint':
			case 'zoomtosearchresult':
			case 'zoomtonote':
			case 'zoomtoroute':
			case 'zoomtotravel':
			case 'additinerarypointmarker':
			case 'addsearchpointmarker':
			case 'addrectangle':
			case 'addwaypoint':
			case 'redrawnote':
			case 'addnote':
				return document;
			default:
				return null;
		}
	}
	
	/*
	--- m_Dispatch function -------------------------------------------------------------------------------------------

	-------------------------------------------------------------------------------------------------------------------
	*/

	function m_Dispatch ( eventName, eventData ) {
		let target = m_GetTarget ( eventName );
		if ( target ) {
			let event = new Event ( eventName );
			if ( eventData ) {
				event.data = eventData;
			}
			target.dispatchEvent ( event );
		}
	}
	
	/* 
	--- eventDispatcher object ----------------------------------------------------------------------------------------
	
	-------------------------------------------------------------------------------------------------------------------
	*/

	return Object.seal ( 
		{
			dispatch: ( eventName, eventData ) => m_Dispatch ( eventName, eventData )
		}
	);
	
}

	
/*
--- End of EventDispatcher.js file ------------------------------------------------------------------------------------
*/	