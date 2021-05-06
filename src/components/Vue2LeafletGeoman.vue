<template>
  <div style="display: none;">
    <slot v-if="ready"></slot>
    <v-dialog
      v-model="dialog"
      max-width="500px"
      class="modal"
    >
      <v-card>
        <v-card-title>
          Dados do Polígono
        </v-card-title>
        <v-card-text>
          <v-text-field v-model="title" label="Título"></v-text-field>
          <v-textarea
            name="description"
            label="Descrição"
            v-model="description"
          ></v-textarea>
          <v-text-field v-model="color" hide-details class="ma-0 pa-0" solo>
            <template v-slot:append>
              <v-menu v-model="menu" top nudge-bottom="105" nudge-left="16" :close-on-content-click="false">
                <template v-slot:activator="{ on }">
                  <div :style="swatchStyle" v-on="on" />
                </template>
                <v-card>
                  <v-card-text class="pa-0">
                    <v-color-picker v-model="color" flat />
                  </v-card-text>
                </v-card>
              </v-menu>
            </template>
          </v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-btn
            text
            @click="dialog = false"
          >
            Fechar
          </v-btn>
          <v-btn
            depressed
            color="primary"
            @click="putTitleAndDescriptionOnLayer()"
          >
            Salvar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
/**
 * Geoman for Vue - created by Max Kalus
 *
 * Install using:
 * npm i @geoman-io/leaflet-geoman-free uuid
 */
import '@geoman-io/leaflet-geoman-free';
import L from 'leaflet';
import { v4 as uuidv4 } from 'uuid';

export default {
  name: 'vue2-leaflet-geoman',
  props: {
    map: {
      type: Object,
      required: true
    },
    locale: {
      type: String,
      default: 'pt_br'
    },
    // initial geoJSON data
    geoJson: {
      type: Object
    }
  },
  data: () => ({
    ready: false,
    title: '',
    description: '',
    dialog: false,
    editLayerId: '',
    color: '#1976D2FF',
		menu: false,
  }),
  computed: {
    swatchStyle() {
      const { color, menu } = this
      return {
        backgroundColor: color,
        cursor: 'pointer',
        height: '30px',
        width: '30px',
        borderRadius: menu ? '50%' : '4px',
        transition: 'border-radius 200ms ease-in-out'
      }
    }
  },
  created () {
    if (this.map) {
      // set global options
      this.map.pm.setGlobalOptions({ allowSelfIntersection: false });

      // set language
      this.map.pm.setLang(this.locale);

      // add controls
      this.map.pm.addControls({
        position: 'topleft'
      });

      // listen to events
      this.map.on('pm:create', this.mapUpdated);
      this.map.on('pm:remove', this.mapUpdated);
      this.map.on('pm:cut', this.mapUpdated);

      // add initial data
      this.importGeoJSON(this.geoJson);
    }
  },
  methods: {
    mapUpdated (event) {
      // add listeners on creation and delete on removal
      if (event.type === 'pm:create') {
        event.layer.on('pm:edit', this.mapUpdated);

        // add data
        event.layer.properties = {
          shape: event.shape
        };

        // radius for circles
        if (event.shape === 'Circle') {
          event.layer.properties.radius = event.layer.getRadius();
        }

        event.layer.internalId = uuidv4();
        event.layer.on('click', () => this.openModal(event.layer));
      }
      if (event.type === 'pm:remove') {
        event.layer.off(); // remove all event listeners
      }

      // emit event
      this.$emit('change', this.getDataAsGeoJSON());
    },
    // export data as GeoJSON object
    getDataAsGeoJSON () {
      // create FeatureCollection
      const geoJSON = {
        type: 'FeatureCollection',
        features: []
      };

      // export each layer
      this.map.eachLayer(function (layer) {
        if (layer.internalId && (layer instanceof L.Path || layer instanceof L.Marker)) {
          const geoJSONShape = layer.toGeoJSON(16); // to precise geo shape!
          geoJSONShape.properties = layer.properties;
          geoJSONShape.id = layer.internalId;
          geoJSON.features.push(geoJSONShape);

          // normalize coordinates (> 180/>90)
          // TODO
        }
      });

      return geoJSON;
    },
    // inport data from GeoJSON
    importGeoJSON (geoJSON) {
      if (geoJSON && geoJSON.type === 'FeatureCollection' && geoJSON.features && geoJSON.features.length) {
        geoJSON.features.forEach(feature => {
          const shape = feature.properties && feature.properties.shape;
          const coordinates = feature.geometry && feature.geometry.coordinates;
          let layer; // define shape for later use
          switch (shape) {
            case 'Circle':
              layer = new L.Circle([coordinates[1], coordinates[0]], feature.properties.radius);
              break;
            case 'CircleMarker':
              layer = new L.CircleMarker([coordinates[1], coordinates[0]]);
              break;
            case 'Marker':
              layer = new L.Marker([coordinates[1], coordinates[0]]);
              break;
            case 'Polyline':
              layer = new L.Polyline(this.switchCoordinates(coordinates));
              break;
            case 'Polygon':
              layer = new L.Polygon(this.switchCoordinates(coordinates));
              break;
            case 'Rectangle':
              layer = new L.Rectangle(this.switchCoordinates(coordinates));
              break;
          }

          if (layer) {
            layer.on('click', () => this.openModal(layer)).addTo(this.map);

            layer.internalId = feature.id;
            layer.properties = feature.properties;

            if (layer?.properties?.color) {
              layer.setStyle({color: layer.properties.color})
            }

            if (layer?.properties?.title) {
              layer.bindTooltip(
                `<strong>${layer.properties.title}</strong>`
              )
            } else {
              layer.bindTooltip(
                `<strong>${layer.internalId}</strong>`
              )
            }

            // add event listener
            layer.on('pm:edit', this.mapUpdated);
          }
        });
      }
    },
    // switch coordinates -> geoJSON to Leaflet
    switchCoordinates (coordinates) {
      return [coordinates[0].map(pair => [pair[1], pair[0]])];
    },
    openModal (layer) {
      this.editLayerId = layer.internalId
      this.dialog = true
      this.title = layer.properties.title ? layer.properties.title : ''
      this.description = layer.properties.description ? layer.properties.description : ''
    },
    putTitleAndDescriptionOnLayer () {
      let ID = this.editLayerId
      let title = this.title
      let description = this.description
      let color = this.color
      this.map.eachLayer(function (layer) {
        if (layer.internalId == ID) {
          layer.properties.title = title
          layer.properties.description = description
          layer.properties.color = color
          layer.setStyle({color})
          layer.bindTooltip(
            `<strong>${layer.properties.title}</strong>`
          )
        }
      });

      // emit event
      this.$emit('change', this.getDataAsGeoJSON());

      this.clearForm()
      this.dialog = false
      this.editLayerId = ''
    },
    clearForm () {
      this.title = ''
      this.description = ''
    },
    // createDrawLayer(map) {
    //   map.pm.enableDraw('Polygon', {
    //     snappable: false,
    //     snapDistance: 20,
    //     allowSelfIntersection: false,
    //     finishOn: 'dblclick',
    //     templineStyle: {
    //       color: 'orange',
    //       dashArray: [10,10],
    //       weight: 5
    //     },
    //     hintlineStyle: {
    //       color: 'orange',
    //       dashArray: [10,10],
    //     },
    //     pathOptions: {
    //       color: 'orange',
    //       fillColor: 'yellow',
    //       dashArray: [10,10],
    //       weight: 5,
    //       fillOpacity: 1,
    //       opacity: 1
    //     }
    //   });
    //   map.on('pm:create', function (e) {
    //     drawnlayers[e.layer._leaflet_id] = e.layer;
    //     createPopupEdit(e.layer);
    //   });
    // }
  }
};
</script>

<style lang="sass">
    @import '~@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
</style>