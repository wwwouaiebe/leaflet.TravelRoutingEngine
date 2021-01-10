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
	- v1.0.0:
		- created
	- v1.4.0:
		- Replacing DataManager with TravelNotesData, Config, Version and DataSearchEngine
		- Working with Promise
		- returning the complete Nominatim responce in place of a computed address
	- v1.6.0:
		- Issue #65 : Time to go to ES6 modules?
		- Issue #68 : Review all existing promises.
	- v1.12.0:
		- Issue #120 : Review the UserInterface
	- v2.0.0:
		- Issue #138 : Protect the app - control html entries done by user.
		- Issue #148 : Nominatim gives bad responses for cities... find a temporary solution.
Doc reviewed 20200802
Tests ...

-----------------------------------------------------------------------------------------------------------------------
*/

/**
@------------------------------------------------------------------------------------------------------------------------------

@file GeoCoder.js
@copyright Copyright - 2017 2021 - wwwouaiebe - Contact: https://www.ouaie.be/
@license GNU General Public License
@private

@------------------------------------------------------------------------------------------------------------------------------
*/

/**
@------------------------------------------------------------------------------------------------------------------------------

@typedef {Object} GeoCoderAddress
@desc An address
@property {string} name The name of the point or an empty string
@property {string} street The house number and the street of the point or an empty string
@property {string} city The city of the point or an empty string

@------------------------------------------------------------------------------------------------------------------------------
*/

/**
@------------------------------------------------------------------------------------------------------------------------------

@module GeoCoder
@private

@------------------------------------------------------------------------------------------------------------------------------
*/

import { theHttpRequestBuilder } from '../util/HttpRequestBuilder.js';
import { theConfig } from '../data/Config.js';
import { ZERO, ONE, TWO } from '../util/Constants.js';
import { theHTMLSanitizer } from '../util/HTMLSanitizer.js';
import { theGeometry } from '../util/Geometry.js';

/**
@------------------------------------------------------------------------------------------------------------------------------

@function ourNewGeoCoder
@desc constructor for GeoCoder objects
@return {GeoCoder} an instance of GeoCoder object
@private

@------------------------------------------------------------------------------------------------------------------------------
*/

const ourQueryDistance = Math.max (
	theConfig.note.svgHamletDistance,
	theConfig.note.svgVillageDistance,
	theConfig.note.svgCityDistance,
	theConfig.note.svgTownDistance
);

function ourNewGeoCoder ( ) {

	let myLatLng = null;

	/**
	@--------------------------------------------------------------------------------------------------------------------------

	@function myParseOverpassData
	@desc This function parse the overpass data, seraching a city name and a place name in the data.
	City name is the osm area name with the greater admin_level (but smaller than 9 ).
	Place name is the osm area name with the greater admin_level (but greater than 8 ) or the nearest node
	with a place tag and values of hamlet, village, city or town.
	@return {Object} an object with the city, place and country foud
	@private

	@--------------------------------------------------------------------------------------------------------------------------
	*/

	function myParseOverpassData ( overpassData ) {
		const OSM_CITY_ADMIN_LEVEL = '8';
		const OSM_COUNTRY_ADMIN_LEVEL = '2';
		const LNG = theConfig.nominatim.language;
		let adminNames = [];
		let places = {
			hamlet : {
				name : null,
				distance : Number.MAX_VALUE,
				maxDistance : theConfig.note.svgHamletDistance
			},
			village : {
				name : null,
				distance : Number.MAX_VALUE,
				maxDistance : theConfig.note.svgVillageDistance
			},
			city : {
				name : null,
				distance : Number.MAX_VALUE,
				maxDistance : theConfig.note.svgCityDistance
			},
			town : {
				name : null,
				distance : Number.MAX_VALUE,
				maxDistance : theConfig.note.svgTownDistance
			}
		};
		overpassData.elements.forEach (
			element => {
				if ( 'area' === element.type ) {
					let elementName = element.tags.name;
					if ( LNG && '*' !== LNG && element.tags [ 'name:' + LNG ] ) {
						elementName = element.tags [ 'name:' + LNG ];
					}
					adminNames [ Number.parseInt ( element.tags.admin_level ) ] = elementName;
				}
				if (
					'node' === element.type &&
					element.tags &&
					element.tags.place &&
					places [ element.tags.place ] &&
					element.tags.name
				) {
					let nodeDistance = theGeometry.pointsDistance ( myLatLng, [ element.lat, element.lon ] );
					let place = places [ element.tags.place ];
					if ( place.maxDistance > nodeDistance && place.distance > nodeDistance ) {
						place.distance = nodeDistance;
						place.name = element.tags.name;
					}
				}
			}
		);

		let adminCity = null;
		let adminHamlet = null;

		for ( let namesCounter = TWO; namesCounter < adminNames.length; namesCounter ++ ) {
			if ( 'undefined' !== typeof ( adminNames [ namesCounter ] ) ) {
				if ( OSM_CITY_ADMIN_LEVEL >= namesCounter ) {
					adminCity = adminNames [ namesCounter ];
				}
				else {
					adminHamlet = adminNames [ namesCounter ];
				}
			}
		}

		let placeName = null;
		let placeDistance = Number.MAX_VALUE;

		Object.values ( places ).forEach (
			place => {
				if ( place.distance < placeDistance ) {
					placeDistance = place.distance;
					placeName = place.name;
				}
			}
		);

		placeName = adminHamlet || placeName;
		if ( placeName === adminCity ) {
			placeName = null;
		}

		return {
			city : adminCity,
			place : adminHamlet || placeName,
			country : adminNames [ OSM_COUNTRY_ADMIN_LEVEL ]
		};
	}

	/**
	@--------------------------------------------------------------------------------------------------------------------------

	@function myParseNominatimData
	@desc This function parse the nominatim data, seraching a street name, a house number and a name from osm data
	@return {Object} an object with the street, name and country found.
	@private

	@--------------------------------------------------------------------------------------------------------------------------
	*/

	function myParseNominatimData ( nominatimData ) {
		let street = '';
		if ( ! nominatimData.error ) {

			// street
			if ( nominatimData.address.house_number ) {
				street += nominatimData.address.house_number + ' ';
			}
			if ( nominatimData.address.road ) {
				street += nominatimData.address.road + ' ';
			}
			else if ( nominatimData.address.pedestrian ) {
				street += nominatimData.address.pedestrian + ' ';
			}

			return {
				street : street,
				nameDetails : nominatimData.namedetails.name,
				country : nominatimData.address.country
			};
		}
		return {
			street : null,
			nameDetails : null,
			country : null
		};
	}

	/**
	@--------------------------------------------------------------------------------------------------------------------------

	@class GeoCoder
	@classdesc This class call Nominatim and parse the response
	@see {@link newGeoCoder} for constructor
	@hideconstructor

	@--------------------------------------------------------------------------------------------------------------------------
	*/

	class GeoCoder {

		/**
		Parse the Nominatim and overpassAPI response
		@param {Array.<object>} data the responses from Nominatim and OverpassAPI
		@return {GeoCoderAddress} the name and address of the point
		*/

		parseResponse ( data ) {
			let overpassData = myParseOverpassData ( data [ ONE ].value );
			let nominatimData = myParseNominatimData ( data [ ZERO ].value );

			let city = overpassData.city;
			if ( overpassData.place ) {
				city += ' (' + overpassData.place + ')';
			}
			let street = nominatimData.street;

			if ( ! street && ! city ) {
				city = nominatimData.country || overpassData.country || '';
			}

			street = street || '';

			let nameDetails = nominatimData.nameDetails || '';
			if ( street.includes ( nameDetails ) || city.includes ( nameDetails ) ) {
				nameDetails = '';
			}

			return Object.seal (
				{
					name : theHTMLSanitizer.sanitizeToJsString ( nameDetails ),
					street : theHTMLSanitizer.sanitizeToJsString ( street ),
					city : theHTMLSanitizer.sanitizeToJsString ( city )
				}
			);
		}

		/**
		get a Promise that will search an address from a point
		@param {Array.<number>} latLng the lat and lng of the point for witch the address is searched
		@return {Promise} a Promise that fulfill with the Nominatim response
		*/

		getPromiseAddress ( latLng ) {
			myLatLng = latLng;
			let NominatimUrl =
				theConfig.nominatim.url + 'reverse?format=json&lat=' +
				latLng [ ZERO ] + '&lon=' + latLng [ ONE ] +
				'&zoom=18&addressdetails=1&namedetails=1';
			let nominatimLanguage = theConfig.nominatim.language;
			if ( nominatimLanguage && '*' !== nominatimLanguage ) {
				NominatimUrl += '&accept-language=' + nominatimLanguage;
			}
			let requestHeaders = null;

			if ( nominatimLanguage && '*' === nominatimLanguage ) {
				requestHeaders = [ { headerName : 'accept-language', headerValue : '' } ];
			}

			/*
			https://lz4.overpass-api.de/api/interpreter?
				data=[out:json][timeout:40];
				is_in(50.644242,5.572354)->.e;
				area.e[admin_level][boundary="administrative"]->.f;
				node(around:1500,50.644242,5.572354)[place]->.g;
				(.f;.g;)->.h;
				.h out;
			*/

			let overpassAPIUrl = theConfig.overpassApi.url +
				'?data=[out:json][timeout:' +
				theConfig.note.svgTimeOut + '];is_in(' + latLng [ ZERO ] + ',' + latLng [ ONE ] +
				')->.e;area.e[admin_level][boundary="administrative"]->.f;node(around:' +
				ourQueryDistance + ',' + latLng [ ZERO ] + ',' + latLng [ ONE ] +
				')[place]->.g;(.f;.g;)->.h;.h out;';

			return Promise.allSettled (
				[
					theHttpRequestBuilder.getJsonPromise ( NominatimUrl, requestHeaders ),
					theHttpRequestBuilder.getJsonPromise ( overpassAPIUrl )
				]
			);
		}
	}

	return Object.seal ( new GeoCoder );
}

export {

	/**
	@--------------------------------------------------------------------------------------------------------------------------

	@function newGeoCoder
	@desc constructor for GeoCoder objects
	@return {GeoCoder} an instance of GeoCoder object
	@global

	@--------------------------------------------------------------------------------------------------------------------------
	*/

	ourNewGeoCoder as newGeoCoder
};

/*
--- End of GeoCoder.js file ---------------------------------------------------------------------------------------------------
*/