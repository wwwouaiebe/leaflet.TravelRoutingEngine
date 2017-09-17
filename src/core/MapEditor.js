/*
Copyright - 2017 - Christian Guyette - Contact: http//www.ouaie.be/

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

( function ( ){
	
	'use strict';
	
	var _Translator = require ( '../UI/Translator' ) ( );
	var _Config = require ( '../util/Config' ) ( );
	var _DataManager = require ( '../Data/DataManager' ) ( );
	var _Utilities = require ( '../util/Utilities' ) ( );

	var getNoteTooltipText = function ( layer ) {
		var note = _DataManager.getNoteAndRoute ( layer.objId ).note;
		return ( note ? note.tooltipContent : '');
	};
	
	var getNotePopUpText = function ( layer ) {
		var note = _DataManager.getNoteAndRoute ( layer.objId ).note;
		return require ( '../core/NoteEditor' )( ).getNoteHTML ( note, 'TravelNotes-' );
	};
	
	var getRouteTooltipText = function ( layer ) {
		var route = _DataManager.getRoute ( layer.objId );
		return ( route ? route.name : '');
	};

	var getRoutePopupText = function ( layer ) {
		var route = _DataManager.getRoute ( layer.objId );
		return require ( '../core/RouteEditor' )( ).getRouteHTML ( route, 'TravelNotes-' );
	};
	
	var onRouteClick = function ( event ) {
		event.target.openPopup ( event.latlng );		
	};
	
	var onRouteContextMenu = function ( event ) {
		require ('../UI/ContextMenu' ) ( event, require ( './RouteEditor' ) ( ).getRouteContextMenu ( event.target.objId ) );
	};

	var onTravelNoteContextMenu = function ( event ) {
		require ('../UI/ContextMenu' ) ( event, require ( './NoteEditor' ) ( ).getNoteContextMenu ( event.target.objId ) );
	};

	var onTravelNoteDragEnd = function ( event ) {
		var note = _DataManager.getNoteAndRoute ( event.target.objId ).note;
		note.iconLatLng = [ event.target.getLatLng ( ).lat, event.target.getLatLng ( ).lng ];
		var layerGroup = _DataManager.mapObjects.get ( event.target.objId );
		layerGroup.getLayer ( layerGroup.polylineId ).setLatLngs ( [ note.latLng, note.iconLatLng ] );
	};
	
	var onWayPointDragEnd = function ( event ) {
		var wayPoint = _DataManager.editedRoute.wayPoints.getAt ( event.target.objId );
		wayPoint.latLng = [ event.target.getLatLng ( ).lat, event.target.getLatLng ( ).lng ];
		require ( '../core/RouteEditor' ) ( ).wayPointDragEnd ( event.target.objId );
	};


	var onTravelNoteDrag = function ( event ) {
		var note = _DataManager.getNoteAndRoute ( event.target.objId ).note;
		var layerGroup = _DataManager.mapObjects.get ( event.target.objId );
		layerGroup.getLayer ( layerGroup.polylineId ).setLatLngs ( [ note.latLng, [ event.latlng.lat, event.latlng.lng ] ] );
	};
	
	var onBulletTravelNoteDragEnd = function ( event ) {
		var noteAndRoute = _DataManager.getNoteAndRoute ( event.target.objId );
		var note = noteAndRoute.note;
		var route = noteAndRoute.route;
		var layerGroup = _DataManager.mapObjects.get ( event.target.objId );
		if ( null != route ) {
			var latLngDistance = require ( '../util/TravelUtilities' ) ( ).getClosestLatLngDistance ( route, [ event.target.getLatLng ( ).lat, event.target.getLatLng ( ).lng] );
			note.latLng = latLngDistance.latLng;
			note.distance = latLngDistance.distance;
			layerGroup.getLayer ( layerGroup.bulletId ).setLatLng ( latLngDistance.latLng );
			route.notes.sort ( function ( a, b ) { return a.distance - b.distance; } );
		}
		else {
			note.latLng = [ event.target.getLatLng ( ).lat, event.target.getLatLng ( ).lng ];
		}
		layerGroup.getLayer ( layerGroup.polylineId ).setLatLngs ( [ note.latLng, note.iconLatLng ] );
	};
	
	var onBulletTravelNoteDrag = function ( event ) {
		var note = _DataManager.getNoteAndRoute ( event.target.objId ).note;
		var layerGroup = _DataManager.mapObjects.get ( event.target.objId );
		layerGroup.getLayer ( layerGroup.polylineId ).setLatLngs ( [ [ event.latlng.lat, event.latlng.lng ], note.iconLatLng ] );
	};
	
	var getMapEditor = function ( ) {
		
		var _AddTo = function ( objId, object ) {
			object.objId = objId;
			object.addTo ( _DataManager.map );
			_DataManager.mapObjects.set ( objId, object );
		};
		var _RemoveFrom = function ( objId ) {
			var layer = _DataManager.mapObjects.get ( objId );
			if ( layer ) {
				L.DomEvent.off ( layer );
				_DataManager.map.removeLayer ( layer );
				_DataManager.mapObjects.delete ( objId );
			}
			else {
				console.log ( 'Object not found for deletion : ' + objId );
			}
				
		};
		
		var _GetLatLngBounds = function ( latLngs ) {
			var sw = L.latLng ( [ 90, 180] );
			var ne = L.latLng ( [ -90, -180 ] );
			latLngs.forEach ( 
				function ( latLng ) {
					sw.lat = Math.min ( sw.lat, latLng [ 0 ] );
					sw.lng = Math.min ( sw.lng, latLng [ 1 ] );
					ne.lat = Math.max ( ne.lat, latLng [ 0 ] );
					ne.lng = Math.max ( ne.lng, latLng [ 1 ] );
				}
			);
			return L.latLngBounds( sw, ne );
		};
		
		var _GetRouteLatLng = function ( route ) {
			var latLngs = [];
			route.itinerary.itineraryPoints.forEach ( 
				function ( itineraryPoint ) {
					latLngs.push ( itineraryPoint.latLng );
				}
			);
			route.notes.forEach ( 
				function ( note ) {
					latLngs.push ( note.latLng );
					latLngs.push ( note.iconLatLng );
				}
			);
			return latLngs;
		};
		
		return {
			
			removeRoute : function ( route, removeNotes, removeWayPoints ) {
				this.removeObject ( route.objId );
				if ( removeNotes ) {
					var notesIterator = route.notes.iterator;
					while ( ! notesIterator.done ) {
						this.removeObject ( notesIterator.value.objId );
					}
				}
				if ( removeWayPoints ) {
					var wayPointsIterator = route.wayPoints.iterator;
					while ( ! wayPointsIterator.done ) {
						this.removeObject ( wayPointsIterator.value.objId );
					}
				}
			},
			
			addRoute : function ( route, addNotes, addWayPoints ) {
				var latLng = [];
				var pointsIterator = route.itinerary.itineraryPoints.iterator;
				while ( ! pointsIterator.done ) {
					latLng.push ( pointsIterator.value.latLng );
				}
				var polyline = L.polyline ( 
					latLng,
					{
						color : route.color,
						weight : route.width
					}
				);
				_AddTo ( route.objId, polyline );
				polyline.addTo ( _DataManager.map );
				polyline.bindTooltip ( getRouteTooltipText );
				polyline.bindPopup ( getRoutePopupText );
				L.DomEvent.on ( polyline, 'click', onRouteClick );
				L.DomEvent.on ( polyline, 'contextmenu', onRouteContextMenu );
				
				if ( addNotes ) {
					var notesIterator = route.notes.iterator;
					while ( ! notesIterator.done ) {
						this.addNote ( notesIterator.value );
					}
				}

				if ( addWayPoints ) {
					var wayPointsIterator = _DataManager.editedRoute.wayPoints.iterator;
					var wayPointsCounter = 0;
					while ( ! wayPointsIterator.done ) {
						this.addWayPoint ( wayPointsIterator.value, wayPointsIterator .first ? 'A' : ( wayPointsIterator.last ? 'B' : ( ++ wayPointsCounter ).toFixed ( 0 ) ) );
					}
				}
								
			},
			
			editRoute : function ( route ) {
				var polyline = _DataManager.mapObjects.get ( route.objId );
				polyline.setStyle( { color : route.color, weight : route.width } );
			},
			
			removeObject : function ( objId ) {
				_RemoveFrom ( objId );
			},
			
			removeAllObjects : function ( ) {
				_DataManager.mapObjects.forEach ( 
					function ( travelObjectValue, travelObjectKey, travelObjects ) {
						L.DomEvent.off ( travelObjectValue );
						_DataManager.map.removeLayer ( travelObjectValue );
					}
				);
				_DataManager.mapObjects.clear ( );
			},
			
			zoomToPoint : function ( latLng ) {
				map.setView ( latLng, _Config.itineraryPointZoom );
			},
			
			zoomToRoute : function ( routeObjId ) {
				var latLngs = _GetRouteLatLng (  _DataManager.getRoute ( routeObjId ) );
				if ( 0 !== latLngs.length ) {
					_DataManager.map.fitBounds ( _GetLatLngBounds ( latLngs ) );
				}
			},
			
			zoomToTravel : function ( ) {				
				var latLngs = [];
				_DataManager.travel.routes.forEach (
					function ( route ) {
						latLngs = latLngs.concat ( _GetRouteLatLng ( route ) );
					}
				);
				travel.notes.forEach (
					function ( note ) {
						latLngs.push ( note.latLng );
						latLngs.push ( note.iconLatLng );
					}
				);
				if ( 0 !== latLngs.length ) {
					_DataManager.map.fitBounds ( _GetLatLngBounds ( latLngs ) );
				}
			},
			
			addItineraryPointMarker : function ( objId, latLng ) {
				_AddTo ( 
					objId,
					L.circleMarker ( latLng, _Config.itineraryPointMarker )
				);
			},
			
			addWayPoint : function ( wayPoint, letter ) {
				if ( ( 0 === wayPoint.lat ) && ( 0 === wayPoint.lng  ) ) {
					return;
				}
				var iconHtml = '<div class="TravelNotes-WayPoint TravelNotes-WayPoint' + 
				( 'A' === letter ? 'Start' : ( 'B' === letter ? 'End' : 'Via' ) )+ 
				'"></div><div class="TravelNotes-WayPointText">' + letter + '</div>';
				
				var marker = L.marker ( 
					wayPoint.latLng,
					{ 
						icon : L.divIcon ( { iconSize: [ 40 , 40 ], iconAnchor: [ 20, 40 ], html : iconHtml, className : 'TravelNotes-WayPointStyle' } ),
						draggable : true
					} 
				);	
				marker.objId = wayPoint.objId;
				_AddTo ( wayPoint.objId, marker );
				L.DomEvent.on ( marker, 'dragend', onWayPointDragEnd );
			},
			
			addNote : function ( note ) {
				var bullet = L.marker ( 
					note.latLng,
					{ 
						icon : L.divIcon ( { iconSize: [ _Config.note.grip.size , _Config.note.grip.size ], iconAnchor: [ _Config.note.grip.size / 2, _Config.note.grip.size / 2 ], html : '<div></div>'} ),
						zIndexOffset : -1000 ,
						opacity : _Config.note.grip.opacity,
						draggable : true
					} 
				);	
				bullet.objId = note.objId;
				L.DomEvent.on ( bullet, 'dragend', onBulletTravelNoteDragEnd );
				L.DomEvent.on ( bullet, 'drag', onBulletTravelNoteDrag );
				var icon = L.divIcon (
					{ 
						iconSize: [ note.iconWidth, note.iconHeight ], 
						iconAnchor: [note.iconWidth / 2, note.iconHeight / 2 ],
						popupAnchor: [ 0, - note.iconHeight / 2 ], 
						html : note.iconContent,
						className : _Config.note.style
					}
				);
				var marker = L.marker ( 
					note.iconLatLng,
					{
						icon : icon,
						draggable : true
					}
				);	
				marker.bindPopup ( getNotePopUpText );
				if ( 0 !== note.tooltipContent.length ) {
					marker.bindTooltip ( getNoteTooltipText );
					marker.getTooltip ( ).options.offset [ 0 ] = note.iconWidth / 2;
				}
				marker.objId = note.objId;
				var polyline = L.polyline ( [ note.latLng, note.iconLatLng ], _Config.note.polyline );
				polyline.objId = note.objId;
				var layerGroup = L.layerGroup ( [ marker, polyline, bullet ] );
				layerGroup.markerId = L.Util.stamp ( marker );
				layerGroup.polylineId = L.Util.stamp ( polyline );
				layerGroup.bulletId = L.Util.stamp ( bullet );
				_AddTo ( note.objId, layerGroup );
				L.DomEvent.on ( marker, 'contextmenu', onTravelNoteContextMenu );
				L.DomEvent.on ( marker, 'dragend', onTravelNoteDragEnd );
				L.DomEvent.on ( marker, 'drag', onTravelNoteDrag );
			},
			
			editNote : function ( note ) {
				var icon = L.divIcon (
					{ 
						iconSize: [ note.iconWidth, note.iconHeight ], 
						iconAnchor: [note.iconWidth / 2, note.iconHeight / 2 ],
						popupAnchor: [ 0, -note.iconHeight / 2 ], 
						html : note.iconContent,
						className : _Config.note.style
					}
				);
				var layerGroup = _DataManager.mapObjects.get ( note.objId );
				var marker = layerGroup.getLayer ( layerGroup.markerId );
				marker.setIcon ( icon );
				marker.unbindTooltip ( );
				if ( 0 !== note.tooltipContent.length ) {
					marker.bindTooltip ( getNoteTooltipText );
					marker.getTooltip ( ).options.offset [ 0 ] = note.iconWidth / 2;
				}
			}
		};
	};
	
	if ( typeof module !== 'undefined' && module.exports ) {
		module.exports = getMapEditor;
	}

}());
