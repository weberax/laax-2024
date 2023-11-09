import Dexie from "dexie";
import Papa from "papaparse"
import { predefinedTricks, predefinedTricksVersion } from "../predefinedTricksCombos"
import { persist, tryPersistWithoutPromtingUser } from "./persistentStorage"
import { importInto, exportDB } from "dexie-export-import";
import fileDownload from 'js-file-download';



export default class Database {

  constructor(testSetupCallback = null) {
    this.db = testSetupCallback === null ? new Dexie("db") : testSetupCallback();

    this.db.version(8).stores({
      versions: "key,version",
      predefinedTricks: "id,alias,technicalName,establishedBy,yearEstablished,linkToVideo,videoStartTime,videoEndTime,startPos,endPos,difficultyLevel,description,stickFrequency,*recommendedPrerequisites,boostSkill",
      userTricks: "++id,stickFrequency,boostSkill",
    });

    this.db.on('ready', () => {
      // count the tricks in the database and populate it if its empty
      return this.db.versions.get("predefinedTricksVersion").then(ret => {
        if (!ret || ret.version < predefinedTricksVersion) {
          return this.populateTricks();
        } else {
          console.log("Did not update predefinedTricks.");
        }
      });
    });

    // try silently to persist the storage, othewise prompt when adding something to the db
    this.persistentStorage = tryPersistWithoutPromtingUser();
  }

  resetAll = () => {
    return this.db.delete();
  };

  // Tricks

  // clear userTricks
  dropUserTricks = () => {
    return this.db.userTricks.clear();
  };

  /**
   * Populate the database with the trick of the predefinedTricks.js file.
   * @returns {Promise<void>}
   */
  populateTricks = async () => {
    await this.db.predefinedTricks.clear();

    const trickList = Papa.parse(predefinedTricks, {dynamicTyping: true}).data;

    const header = trickList.shift();
    const tricks = trickList.map(trick => {
      return Object.assign.apply({}, header.map((v, i) => ({[v]: trick[i]})));
    });

    for(const trick of tricks) {
      trick.stickFrequency = 0;
      trick.recommendedPrerequisites = normalizeTrickPrerequisites(trick.recommendedPrerequisites);
      trick.tips = trick.tips ? trick.tips.split(";") : [];
    }

    await this.db.predefinedTricks.bulkPut(tricks);
    await this.db.versions.put({"key": "predefinedTricksVersion", "version": predefinedTricksVersion});
  };

  // helper function to combine two lists, 
  // where entries which share the same keys, get merged 
  // and atributes of the first list are prefered
  mergeLists = (listA, listB) => {
    if (listA && !listB) return null;
    if (!listA && listB) return listB;
    if (!listA && !listB) return null;
    // Merge the two lists based on the common "id" attribute 
    return listA.map((objA) => {
      const objB = listB.find((objB) => objB.id === objA.id);
      if (objB) {
        // Combine the attributes of listA and listB, removing duplicates from listB
        const objBcopy = { ...objB };
        Object.keys(objA).forEach((key) => {
          if (key !== "id" && key !== "stickFrequency"){
            delete objA[key];
          } else if (key in objB) {
            delete objBcopy[key];
          }
        });
        return { ...objA, ...objBcopy };
      } else {
        // If the id is unique keep it as is
        objA.deleted = true;
        return objA;
      }
    }).concat(listB.filter((objB) => !listA.some((objA) => objA.id === objB.id)))
  };

  // get single trick by id
  getTrick = (id) => this.db.userTricks.get(Number(id)).then(userTrick => {
      return this.db.predefinedTricks.get(Number(id)).then(preTrick => {
        // overwrite all user set attributes
        return {...preTrick, ...userTrick};
      });
    });

  /**
   * Get a list of all tricks. All Tricks from both of the tables are combined by their ids. If an entry exists in
   * both tables, the one from the userTricks table is used.
   */
  getAllTricks = async () => {
    const[userTricks, preTricks] = await Promise.all([
      await this.db.userTricks.toArray(),
      await this.db.predefinedTricks.toArray(),
    ]);
    return this.mergeLists(userTricks, preTricks)
        .filter(trick => !trick.deleted)
        .sort((a,b) => a.id - b.id);
  };

  /**
   * Provided a list of trick ids, a list of tricks is returned which has the same number of elements and the same order
   * as the original list.
   */
  getTricksByIds = async (ids) => {
    const allTrickInfo = await this.getAllTricks()
    const allTrickLookup = {}
    allTrickInfo.forEach(e => allTrickLookup[e.id] = e)

    const tricks = []
    for (let i = 0; i < ids.length; i++) {
      if (Object.keys(allTrickLookup).includes("" + ids[i])) {
        tricks.push(allTrickLookup[ids[i]])
      } else {
        throw new Error(`Id '${ids[i]}' not in database.`)
      }
    }
    return tricks
  };


  getTricksByDiffAndByFreq = (diffLevels, stickFreqs) => {
    return this.getAllTricks().then(tricks => {
      return tricks.filter(trick => {
        return (diffLevels.includes(trick.difficultyLevel) && stickFreqs.includes(trick.stickFrequency));
      });
    });
  };

  // create or update userTrick
  saveTrick = (trick) => {
    // if needing to prompt for persistence prompt now
    persist();

    if (trick.recommendedPrerequisites) {
      // replace recTricks by their id
      trick.recommendedPrerequisites = trick.recommendedPrerequisites.map(recTrick => recTrick.id);
    }
    if (trick.id) {
      // trick has an id, so exists already in database
      return this.db.predefinedTricks.get(trick.id).then( (preTrick) => {
        if (preTrick) {
          // we check what fields the user changed from the default and only save them into the userTricks
          for (let attribute in preTrick) {
            if (attribute !== "id" && trick.hasOwnProperty(attribute)) {
              if ((preTrick[attribute] === trick[attribute] || !trick[attribute]) || (Array.isArray(preTrick[attribute]) && preTrick[attribute].toString() === trick[attribute].toString())) {
                // comparing eiter values or if its an array the string of the whole array ()
                delete trick[attribute];
              };
            };
          };
        };
        // trick is a pure userTrick so all values are kept
        return this.db.userTricks.put(trick);
      });
    }
    else {
      // get new non colliding id
      return this.db.predefinedTricks.toCollection().primaryKeys().then( (trickKeys) => {
        this.db.userTricks.toCollection().primaryKeys().then( userTrickKeys => {
          const keysSet = new Set(trickKeys.concat(userTrickKeys));
          for (var key = 1; key < 10000; key++) {
            if (!keysSet.has(key)) {
              trick.id = key;
              this.db.userTricks.put(trick)
              break;
            }
          }
        })
      });
    }
  };

  // updatesonly the stickFrequency if a trick with the id exists in the userTricks tabel, ohterwise creates a new entry
  changeTrickStickFrequency = (trickId, newFrequency) => {
    return this.db.userTricks.update(trickId, {stickFrequency: newFrequency}).then((worked) => {
      if (!worked) return this.db.userTricks.put(Object({id: trickId, stickFrequency: newFrequency}));
    });
  };

  // updates only the boostSkill if a trick with the id exists in the userTricks tabel, ohterwise creates a new entry
  changeBoostSkill = (trickId, isBoosted) => {
    return this.db.userTricks.update(trickId, {boostSkill: isBoosted}).then((worked) => {
      if (!worked) return this.db.userTricks.put(Object({id: trickId, boostSkill: isBoosted}));
    });
  };

  // delete trick
  deleteTrick = (id) => this.db.userTricks.put({"id": Number(id), deleted: true});


  // export only the userTricks table
  exportDatabase = async () => {
    try {
      const jsonString = await exportDB(this.db,{
        filter: (table, value, key) => table === "userTricks"
      });
      const date = new Date();
      fileDownload(jsonString, "highline-freestyle.com".concat(date.toLocaleDateString().replaceAll("/","-"), ".json"));
    } catch (error) {
      console.error(''+error);
    }
  };

  // import user data and overwrite values
  importDatabase = async (file) => {
    try {
      this.db = await importInto(this.db, file, {
        overwriteValues : true
      });
    } catch (error) {
      console.error(''+error);
    }
  };

}

/**
 * Takes the recommended prerequisites of a trick as either a number or a semicolon separated string and returns it
 * / them as an array of numbers (ids). If the prerequisites are of any other type, they are simply returned as they
 * are. If undefined or null is passed, an empty array is returned.
 */
function normalizeTrickPrerequisites(prerequisites) {
  if (!prerequisites) {
    return [];
  }
  if (typeof prerequisites === "string") {
    return prerequisites.split(";").map(string => Number(string));
  }
  if (typeof prerequisites === "number") {
    return [prerequisites];
  }
  return prerequisites;
}
