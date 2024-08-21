/* eslint-disable no-alert, no-console */
const getFilesInfo = async (api, key, idsList, types) => {
  let params = new URLSearchParams();
  types.forEach((type) => {
    params.append('filetypes', type);
  });
  let response = await fetch(`${api}/get-organ-curies/?${params}`);
  let data = await response.json();
  const identifiers = [];
  data.uberon.array.forEach(pair => {
    const identifier = {
      id: pair.id.toUpperCase(),
      name: pair.name
    };
    if (idsList.includes(identifier[key])) {
      identifiers.push(identifier);
    }
  });
  const keys = identifiers.map((item) => item[key]);
  response = await fetch(`${api}/get-files-info-for-curies`, {
    method: "POST",
    body: JSON.stringify(
      {
        filetypes: types,
        curies: keys,
      }
    ),
    headers: {
      "Content-Type": "application/json",
    },
  });
  data = await response.json();
  return data;
}

export default {
  // Note that the setting store is included in MapContent.vue
  methods: {
    getBiolucidaThumbnailURL: function(thumbnailId) {
      return `${this.sparcAPI}/thumbnail/${thumbnailId}`
    },
    getBiolucidaThumbnails: async function (key, idsList) {
      try {
        const data = await getFilesInfo(this.sparcAPI, key, idsList, ["biolucida-2d", "biolucida-3d"]);
        if (data['files_info']) {
          const images = {};
          for (const [key, value] of Object.entries(data['files_info'])) {
            if (value.length > 0) {
              const list = [];
              value.forEach((entry) => {
                if (entry.biolucida_id) {
                  let image = {
                    thumbnail: this.getBiolucidaThumbnailURL(entry.biolucida_id),
                    resource: entry.file_path,
                    datasetId: entry.id,
                  }
                  list.push(image);
                }
              });
              images[key] = list;
            }
          }
          return images;
        }
      } catch (error) {
        console.error('Error:', error);
      }
      return {};
    },
    findEntryWithPathInArray(entry, list, type) {
      if (entry && list) {
        for (let i = 0; i < entry.isSourceOf.length; i++) {
          for (let l = 0; l < list.length; l++) {
            const item = list[l];
            if (entry.id === item.id && (!type || item.type === type) && 
              entry.isSourceOf[i] === item.file_path) {
              return item;
            }
          }
        }
      }
      return undefined
    },
    getScaffoldThumbnailURL: function(entry, list) {
      const viewEntry = this.findEntryWithPathInArray(
        entry, list, "abi-scaffold-view-file");
      const thumbnailEntry = this.findEntryWithPathInArray(
        viewEntry, list, "abi-thumbnail");
      if (thumbnailEntry) {
        return `${this.sparcAPI}/s3-resource/${thumbnailEntry.id}/files/${thumbnailEntry.file_path}`;
      }
      return undefined;
    },
    getScaffoldThumbnails: async function (key, idsList) {
      try {
        const data = await getFilesInfo(this.sparcAPI, key, idsList,
          ["abi-thumbnail", "abi-scaffold-metadata-file", 'abi-scaffold-view-file']);
        if (data['files_info']) {
          const images = {};
          for (const [key, value] of Object.entries(data['files_info'])) {
            if (value.length > 0) {
              const list = [];
              value.forEach((entry) => {
                if (entry.type === "abi-scaffold-metadata-file") {
                  const thumbnailURL = this.getScaffoldThumbnailURL(entry, value);
                  if (thumbnailURL) {
                    let image = {
                      thumbnail: thumbnailURL,
                      resource: entry.file_path,
                      datasetId: entry.id,
                    }
                    list.push(image);
                  }
                }
              });
              images[key] = list;
            }
          }
          return images;
        }
      } catch (error) {
        console.error('Error:', error);
      }
      return {};
    },
    //Get representative segmentations thumbnails
    //  key - can either be
    //    id - use the uberon id as key or
    //    name - anatomical name as key
    //  idsList - Only id / name from the server matching the one in this list
    // will be used
    getSegmentationThumbnails: async function (key, idsList) {
      try {
        const data = await getFilesInfo(this.sparcAPI, key, idsList, ["mbf-segmentation"]);
        if (data['files_info']) {
          const images = {};
          for (const [key, value] of Object.entries(data['files_info'])) {
            if (value.length > 0) {
              const list = [];
              value.forEach((entry) => {
                let image = {
                  thumbnail: this.getSegmentationThumbnailURL(entry.id,
                    entry.version, entry.file_path),
                  resource: entry.file_path,
                  datasetId: entry.id,
                }
                list.push(image);
              });
              images[key] = list;
            }
          }
          return images;
        }
      } catch (error) {
        console.error('Error:', error);
      }
      return {};
    },
    getSegmentationThumbnailURL: function(datasetId, datasetVersion, filePath) {
      return `${this.sparcAPI}/thumbnail/neurolucida?datasetId=${datasetId}&version=${datasetVersion}&path=files/${filePath}`;
    },
    getPlotThumbnailURL: function(entry) {
      //None of the thumbnail for plot is properly annotated.
      //We will use the first in is source of for testing.
      if (entry.isSourceOf.length > 0) {
        return `${this.sparcAPI}/s3-resource/${entry.id}/files/${entry.isSourceOf[0]}`;
      }
      return undefined;
    },
    getPlotThumbnails: async function (key, idsList) {
      try {
        const data = await getFilesInfo(this.sparcAPI, key, idsList,
          ["abi-plot", "abi-thumbnail"]);
        if (data['files_info']) {
          const images = {};
          for (const [key, value] of Object.entries(data['files_info'])) {
            if (value.length > 0) {
              const list = [];
              value.forEach((entry) => {
                if (entry.type === "abi-plot") {
                  const thumbnailURL = this.getPlotThumbnailURL(entry);
                  if (thumbnailURL) {
                    let image = {
                      thumbnail: thumbnailURL,
                      resource: entry.file_path,
                      datasetId: entry.id,
                    }
                    list.push(image);
                  }
                }
              });
              images[key] = list;
            }
          }
          return images;
        }
      } catch (error) {
        console.error('Error:', error);
      }
      return {};
    },
  }
}