<template>
  <v-layout>
    <v-row class="map" justify="center">
      <v-col
        class="mb-1"
        cols="12">
        <l-map ref="map" :zoom="zoom" :center="center">
          <l-control-layers position="topright"  ></l-control-layers>
          <l-tile-layer :url="url" attribution="Sistema de Mapas/PB" />
          <LeafletGeomanMap :map="mapObject"
                            v-if="mapObject"
                            :geo-json="polygons"
                            :draw-layer="drawLayer"
                            @polygon:create="newPolygon($event)"
                            @polygon:geometry="updatePolygonGeometry($event)"
                            @polygon:description="updatePolygonDescription($event)"
                            @polygon:delete="deletePolygon($event)" />
          <l-control position="topleft" >
            <v-btn
              @click="clickHandler"
              elevation="2"
              title="Denhar Polígono"
              fab
              dark
              small
              color="primary"
            >
              <v-icon dark>
                mdi-vector-polygon
              </v-icon>
            </v-btn>
          </l-control>
        </l-map>
      </v-col>
    </v-row>
  </v-layout>
</template>

<script>
// eslint-disable-next-line no-unused-vars
import L from 'leaflet'
import '@geoman-io/leaflet-geoman-free'
import {LMap, LControl, LControlLayers, LTileLayer} from 'vue2-leaflet'
import LeafletGeomanMap from './LeafletGeomanMap'
  export default {
    name: 'HelloWorld',
    components: {
        LMap,
        LControl,
        LeafletGeomanMap,
        LControlLayers,
        LTileLayer
    },

    data: () => ({
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      zoom: 12,
      center: {lat: -7.1136057, lng: -34.9780756},
      polygons: {},
      mapObject: null,
      mapLayer: 'roadmap',
      drawLayer: false
    }),
    methods: {
      getPolygonsOnLocalStorage() {
        const json = localStorage.getItem('polygons')
        return JSON.parse(json) || {}
      },
      clickHandler() {
        this.drawLayer = true
      },
      newPolygon(layer) {
        console.log(layer)
        this.drawLayer = false
        this.saveNewPolygonOnLocalStorage(layer)
      },
      saveNewPolygonOnLocalStorage(layer) {
        let geoJson = this.getPolygonsOnLocalStorage()

        if (!geoJson.features) {
          geoJson = {
            type: 'FeatureCollection',
            features: []
          }
        }
        geoJson.features.push(layer)
        localStorage.setItem('polygons', JSON.stringify(geoJson))
      },
      updatePolygonDescription(layer) {
        let geoJson = this.getPolygonsOnLocalStorage()
        geoJson.features.forEach((polygon) => {
          if (polygon.properties.internalId == layer.properties.internalId) {
            polygon.properties.title = layer.properties.title
            polygon.properties.description = layer.properties.description
            polygon.properties.color = layer.properties.color
          }
        })
        localStorage.setItem('polygons', JSON.stringify(geoJson))
      },
      updatePolygonGeometry(layer) {
        let geoJson = this.getPolygonsOnLocalStorage()
        geoJson.features.forEach((polygon) => {
          if (polygon.properties.internalId == layer.properties.internalId) {
            polygon.geometry = layer.geometry
          }
        })
        localStorage.setItem('polygons', JSON.stringify(geoJson))
      },
      deletePolygon(layer) {
        let geoJson = this.getPolygonsOnLocalStorage()
        geoJson.features.forEach((polygon, i) => {
          if (polygon.properties.internalId == layer.properties.internalId) {
            geoJson.features.splice(i, 1)
            console.log('removi')
          }
        })
        localStorage.setItem('polygons', JSON.stringify(geoJson))
      }
    },
    created () {
      this.polygons = this.getPolygonsOnLocalStorage()
      // this.polygons = this.polygons?.features?.map(polygon => JSON.parse(polygon));
    },
    mounted () {
      this.mapObject = this.$refs.map.mapObject
      // this.importGeoJSON(this.polygons)
    }
  }
</script>