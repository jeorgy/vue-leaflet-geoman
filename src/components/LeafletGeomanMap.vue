<template>
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
</template>
<script>
// eslint-disable-next-line no-unused-vars
import L from 'leaflet'
import '@geoman-io/leaflet-geoman-free'
import { v4 as uuidv4 } from 'uuid';
export default {
    name: 'leaflet-geoman-map',
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
        },
        drawLayer: {
            type: Boolean,
            default: false
        }
    },
    data: () => ({
      title: '',
      description: '',
      color: '#1976D2FF',
      dialog: false,
      menu: false,
      layerEditId: null
    }),
    methods: {
        // switch coordinates -> geoJSON to Leaflet
        switchCoordinates (coordinates) {
            return [coordinates[0].map(pair => [pair[1], pair[0]])];
        },
        // import data from GeoJSON
        importGeoJSON (geoJSON) {
            if (geoJSON && geoJSON.type === 'FeatureCollection' && geoJSON.features && geoJSON.features.length) {
            geoJSON.features.forEach(feature => {
                const coordinates = feature.geometry && feature.geometry.coordinates;
                let layer; // define shape for later use
                layer = new L.Polygon(
                    this.switchCoordinates(coordinates),
                    {color: feature.properties.color ? feature.properties.color : '#1976D2FF'}
                );
                if (feature.properties.title) {
                    layer.bindTooltip(
                    `<strong>${feature.properties.title}</strong>`
                    )
                }
                layer.internalId = feature.properties.internalId
                layer.properties = feature.properties

                layer.addTo(this.map)

                if (layer) {
                    this.createPopupEdit(layer)
                }
            });
            }
        },
        // export data as GeoJSON object
        getDataAsGeoJSON (layer) {
            // create Polygon
            const polygon = layer.toGeoJSON(16) // to precise geo shape!
            polygon.properties = layer.options
            polygon.properties.internalId = layer.internalId
            polygon.properties.shape = layer.shape

            return polygon
        },
        clearForm() {
            this.title = ''
            this.description = ''
        },
        createDrawLayer(map) {
            map.pm.enableDraw('Polygon', {
            snappable: false,
            snapDistance: 20,
            allowSelfIntersection: false,
            finishOn: 'dblclick',
            templineStyle: {
                color: 'black',
                dashArray: [10,10],
                weight: 3
            },
            hintlineStyle: {
                color: '#7A797A',
                dashArray: [10,10],
            },
            pathOptions: {
                color: '#1976D2FF',
                fillColor: '#1976D2FF',
                weight: 2,
                fillOpacity: 0.2,
                opacity: 1
            }
            })
            map.on('pm:create', (e) => {
                e.layer.internalId = uuidv4()
                e.layer.shape = e.shape
                this.layerEditId = e.layer.internalId
                let polygon = this.getDataAsGeoJSON(e.layer)
                this.geoJson[e.layer._leaflet_id] = e.layer;
                this.createPopupEdit(e.layer)
                this.$emit('polygon:create', polygon)
                this.dialog = true
            });
        },
        createPopupEdit(layer) {
            let b_edit = document.createElement('button');
            b_edit.classList.add('popup-btn','btn-primary');
            b_edit.textContent = 'Editar';

            let b_del = document.createElement('button');
            b_del.textContent = 'Deletar';
            b_del.classList.add('popup-btn','btn-danger');
            b_del.addEventListener('click',() => {
            delete this.geoJson[layer._leaflet_id];
                this.map.removeLayer(layer)
                this.deleteDrawLayer(layer)
            })

            let b_close = document.createElement('button');
            b_close.classList.add('popup-btn','btn-success');
            b_close.textContent = 'PE';
            b_close.addEventListener('click',() => {
                layer.pm.disable();
            })

            let b_setdescription = document.createElement('button');
            b_setdescription.textContent = 'Descrição';
            b_setdescription.classList.add('popup-btn','btn-primary');
            b_setdescription.addEventListener('click',() => {
                this.layerEditId = layer.internalId
                this.openModal(layer);
            })

            let buttonpanel = document.createElement('div');
            buttonpanel.appendChild(b_edit);
            buttonpanel.appendChild(b_close);
            buttonpanel.appendChild(b_del);
            buttonpanel.appendChild(b_setdescription);
            if (layer.properties?.title) {
                let t_description_div = document.createElement('div');
                let t_title = document.createElement('p');
                t_title.textContent = layer.properties.title
                let t_description = document.createElement('p');
                t_description.textContent = layer.properties.description
                t_description_div.appendChild(t_title)
                t_description_div.appendChild(t_description)
                buttonpanel.appendChild(t_description_div)
            }
            layer.bindPopup(buttonpanel);
            b_edit.addEventListener('click',() => {
                this.map.closePopup();
                this.map.pm.disableGlobalEditMode();
                this.editDrawLayer(layer)
            })
        },
        putTitleAndDescriptionOnLayer () {
            this.map.eachLayer((layer) => {
                if (layer.internalId == this.layerEditId) {
                    layer.options.title = this.title
                    layer.options.description = this.description
                    layer.options.color = this.color
                    layer.setStyle({color: this.color, fillColor: this.color})
                    layer.bindTooltip(
                    `<strong>${layer.options.title}</strong>`
                    )
                    let polygon = this.getDataAsGeoJSON(layer)
                    this.$emit('polygon:description', polygon)
                }
            });

            this.clearForm()
            this.dialog = false
            this.layerEditId = null
        },
        editDrawLayer(layer) {
            console.log(layer)
            layer.pm.enable({
                allowSelfIntersection: false,
                snappable: false,
                snapDistance: 20
            });
            layer.on('pm:disable', (e) => {
                let polygon = this.getDataAsGeoJSON(e.layer)
                this.$emit('polygon:geometry', polygon)
                this.map.closePopup();
            })
        },
        deleteDrawLayer(layer) {
            let polygon = this.getDataAsGeoJSON(layer)
            this.$emit('polygon:delete', polygon)
        },
        openModal(layer) {
            console.log(layer)
            this.color = layer.properties?.color
            this.title = layer.properties?.title
            this.description = layer.properties?.description
            this.dialog = true
        },
    },
    mounted() {
        this.importGeoJSON(this.geoJson)
    },
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
    watch: {
        drawLayer() {
            this.drawLayer ? this.createDrawLayer(this.map) : null
        }
    }
}
</script>

<style>
.modal {
    z-index: 10000;
  }
  .popup-btn {
    border: none;
    border-radius: 2px;
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
    cursor: pointer;
    color: white;
    box-shadow: 0 0 4px #999;
    outline: none;
    margin-right: 0.4rem;
  }
  .btn-primary {
    background-color: #2196f3;
  }
  .btn-danger {
    background-color: #b94744;
  }
  .btn-success {
    background-color: #4ab15b;
  }
</style>
<style lang="sass">
    @import '~@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
</style>