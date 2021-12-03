var WebSocketServer = require("websocket").server;
const MongoClient = require("mongodb").MongoClient;
var request = require("request");
var http = require("http");
var fs = require("fs");
const md5File = require("md5-file");

const url = "mongodb://localhost:27017/";
const mongoClient = new MongoClient(url, { useNewUrlParser: true });
const databasename = "Intertop-S-M-S-DB";

let settings = JSON.parse(fs.readFileSync("settings.json"));
console.log(settings);

const filesfoulder = settings["filesfoulder"];
const port = settings["port"];
const tar_name = settings["tar_name"];
const tar_foulder = settings["tar_foulder"];

const tar_path = process.cwd() + tar_foulder + tar_name;
let Server_timestamp = new Date().getTime();

async function SHOPSQUERY() {
  var data = {};
  let body = await new Promise((res) =>
    request.get(
      "https://esb-api.intertop.ua/kvinto/in?SHOPS",
      { json: data, headers: {}, timeout: 90000, oauth: {} },
      function (error, response, body) {
        if (error) {
          res({ error: "timeout" });
        } else {
          res(body);
        }
      }
    )
  );
  return body;
}

function timer(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
function chunkString(str, len) {
  var _size = Math.ceil(str.length / len),
    _ret = new Array(_size),
    _offset;

  for (var _i = 0; _i < _size; _i++) {
    _offset = _i * len;
    _ret[_i] = str.substring(_offset, _offset + len);
  }

  return _ret;
}

var getFiles = function (dir, files_) {
  files_ = files_ || [];
  var files = fs.readdirSync(dir);
  for (var i in files) {
    var name = dir + "/" + files[i];
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files_);
    } else {
      files_.push(name);
    }
  }
  return files_;
};

var getFoulders = function (dir, files_) {
  files_ = files_ || [];
  var files = fs.readdirSync(dir);
  for (var i in files) {
    var name = dir + "/" + files[i];
    if (fs.statSync(name).isDirectory()) {
      files_.push(name);
      getFoulders(name, files_);
    } else {
    }
  }
  return files_;
};

var getlVL1_Files_with_hash = function (dir, files_) {
  files_ = files_ || {};
  var files = fs.readdirSync(dir);
  for (var i in files) {
    var name = dir + "/" + files[i];
    if (fs.statSync(name).isDirectory()) {
    } else {
      files_[files[i]] = md5File.sync(dir + "/" + files[i]);
    }
  }
  return files_;
};

function Curent_Date() {
  var now = new Date();
  now.setDate(now.getDate() - 1);
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  let day = now.getDate();
  let querydate = year + "-" + month + "-" + day;
  return querydate;
}
/******************************** */

let CUTED_FILES = {}; //{"filename":{"hash":"","parts":[],"length":12235}}
let CUTED_TAR;
let TAR_HASH;
var server = http.createServer(function (request, response) {
  console.log(new Date() + " Received request for " + request.url);
  response.writeHead(404);
  response.end();
});

async function read_files() {
  let sendedfiles = await getlVL1_Files_with_hash(filesfoulder);
  for (let filename of Object.keys(sendedfiles)) {
    await new Promise((res) =>
      fs.readFile(filesfoulder + "/" + filename, async function (err, data) {
        CUTED_FILES[filename] = {
          hash: sendedfiles[filename],
          parts: chunkString(data.toString("base64"), 1200000),
          length: data.toString("base64").length,
        };
        res();
      })
    );
  }

  TAR_HASH = md5File.sync(tar_path);
  CUTED_TAR = await new Promise((res) =>
    fs.readFile(tar_path, async function (err, data) {
      res(chunkString(data.toString("base64"), 1200000));
    })
  );
}

async function WORKING_SERVER() {
  server.listen(port, async function () {
    let shops = await SHOPSQUERY();
    console.log("=============================");
    fs.writeFileSync("out_shops.json", JSON.stringify(shops));
    console.log("=============================");

    console.log("TAR LENGTH=", CUTED_TAR.length);
    console.log(new Date() + " Server is listening on port " + port);
  });

  wsServer = new WebSocketServer({
    httpServer: server,

    autoAcceptConnections: false,
  });

  function originIsAllowed(origin) {
    return true;
  }
  mongoClient.connect(async function (err, client) {
    const db = client.db(databasename);
    const collection_masters = db.collection("cioscs-masters");
    const collection__slaves = db.collection("cioscs-slaves");
    collection_masters.updateMany(
      {},
      { $set: { working: false } },
      function (err, res) {
        if (err) throw err;
      }
    );
    collection__slaves.updateMany(
      {},
      { $set: { working: false } },
      function (err, res) {
        if (err) throw err;
      }
    );
    wsServer.on("request", function (request) {
      if (!originIsAllowed(request.origin)) {
        request.reject();
        console.log(
          new Date() +
            " Connection from origin " +
            request.origin +
            " rejected."
        );
        return;
      }

      var connection = request.accept("echo-protocol", request.origin);
      console.log(new Date() + " Connection accepted.");

      connection.on("message", async function (message) {
        /***************************** */
        async function getElement(this_ip) {
          return new Promise(function (resolve, reject) {
            collection_masters.findOne(
              { _id: this_ip },
              function (err, result) {
                resolve(result);
              }
            );
          });
        }
        async function getElement_Slave(this_ip) {
          return new Promise(function (resolve, reject) {
            collection__slaves.findOne(
              { _id: this_ip },
              function (err, result) {
                resolve(result);
              }
            );
          });
        }

        async function setElement(this_ip, value) {
          var myquery = { _id: this_ip };

          var newvalues = { $set: value };
          collection_masters.updateOne(myquery, newvalues, function (err, res) {
            console.log("SETVALUES");
            if (err) throw err;
          });

          return;
        }
        async function setElement_Slave(this_ip, value) {
          return new Promise(function (resolve, reject) {
            var myquery = { _id: this_ip };
            var newvalues = { $set: value };
            collection__slaves.updateOne(
              myquery,
              newvalues,
              function (err, res) {
                if (err) throw err;
              }
            );
          });
        }
        /***************************** */

        if (message.type === "utf8") {
          let received_obj = JSON.parse(message.utf8Data);

          console.log("---------received_obj---------");
          console.log(received_obj["type"]);
          console.log("------------------------------");
          if (received_obj["type"] == "client-master-connection") {
            //TODO: тут логика отслеживания приветствия

            console.log(received_obj["data"]);

            let this_ip = connection.remoteAddress
              .substr(7)
              .replace(/[\x00-\x1F\x7F-\x9F]/g, "");

            let finduser = await getElement(this_ip);

            let tar_permission = false;
            let tar_have = false;

            if (finduser != undefined && finduser != null) {
              if (finduser["tar_permission"] != null) {
                tar_permission = finduser["tar_permission"];
              }
              if (finduser["tar_have"] != null) {
                tar_have = finduser["tar_have"];
              }
            }

            let user = {
              _id: this_ip,
              MTI: received_obj["data"]["MTI"],
              city: received_obj["data"]["city"],
              haveInfo: received_obj["data"]["haveInfo"],
              tar_permission: tar_permission,
              tar_have: tar_have,
              working: true,
            };
            console.log("user=", user);
            collection_masters.findOne(
              { _id: this_ip },
              function (err, result) {
                if (result != null) {
                  var myquery = { _id: this_ip };

                  var newvalues = { $set: user };
                  collection_masters.updateOne(
                    myquery,
                    newvalues,
                    function (err, res) {
                      if (err) throw err;
                      console.log("1 document updated");
                    }
                  );
                } else {
                  console.log("NEED INSERT");
                  collection_masters.insertOne(user, function (err, result) {
                    if (err) {
                      return console.log(err);
                    }
                  });
                }
              }
            );

            console.log("---------HELLOW----------");
          }
          if (received_obj["type"] == "client-slave-connection") {
            console.log(
              "-------------CLIENT SLAVE CONNECTED------------------"
            );
            console.log(received_obj["data"]);

            //TODO: тут логика отслеживания приветствия

            let this_ip = connection.remoteAddress
              .substr(7)
              .replace(/[\x00-\x1F\x7F-\x9F]/g, "");

            let finduser = await getElement_Slave(this_ip);
            let tar_permission = false;
            let tar_have = false;

            if (finduser != undefined && finduser != null) {
              if (finduser["tar_permission"] != null) {
                tar_permission = finduser["tar_permission"];
              }
              if (finduser["tar_have"] != null) {
                tar_have = finduser["tar_have"];
              }
            }

            let slave_ciosc = {
              _id: received_obj["data"]["ip"],
              master_ip: this_ip,
              MTI: received_obj["data"]["MTI"],
              city: received_obj["data"]["city"],
              tar_permission: tar_permission,
              tar_have: tar_have,
              working: true,
            };
            console.log("user=", slave_ciosc);
            collection__slaves.findOne(
              { _id: this_ip },
              function (err, result) {
                if (result != null) {
                  var myquery = { _id: this_ip };
                  var newvalues = { $set: slave_ciosc };
                  collection__slaves.updateOne(
                    myquery,
                    newvalues,
                    function (err, res) {
                      if (err) throw err;
                    }
                  );
                } else {
                  collection__slaves.insertOne(
                    slave_ciosc,
                    function (err, result) {
                      if (err) {
                        return console.log(err);
                      }
                    }
                  );
                }
              }
            );
          }
          if (received_obj["type"] == "client-slave-disconected") {
            let this_ip = received_obj["data"]["disconectedIP"];

            console.log(
              new Date() + " Peer " + this_ip + "SLAVE disconnected."
            );

            var myquery = { _id: this_ip };
            console.log("myquery=", myquery);

            var newvalues = { $set: { working: false } };
            collection__slaves.updateOne(
              myquery,
              newvalues,
              function (err, res) {
                if (err) throw err;
              }
            );
          }
          /*************************send_tar_to_client ************************/
          if (received_obj["type"] == "send_tar_to_client") {
            let this_ip = received_obj["data"]["ip"];
            var myquery = { _id: this_ip };

            var newvalues = { $set: { tar_permission: false } };
            collection__slaves.updateOne(
              myquery,
              newvalues,
              function (err, res) {
                if (err) throw err;
              }
            );
          }

          /*************************client_hellow ************************/
          if (received_obj["type"] == "client_hellow") {
            let this_ip = connection.remoteAddress
              .substr(7)
              .replace(/[\x00-\x1F\x7F-\x9F]/g, "");
            console.log(this_ip + " Say Hellow!");
          }

          if (received_obj["type"] == "get_tar") {
            await timer(1000).then(async function () {
              let this_ip = connection.remoteAddress
                .substr(7)
                .replace(/[\x00-\x1F\x7F-\x9F]/g, "");

              if (received_obj["tar_parts"] == undefined) {
                received_obj["tar_parts"] = {};
              }

              console.log(
                "TAR_REQUEST___",
                this_ip,
                "____",
                received_obj["tar_parts"]
              );

              if (CUTED_TAR != undefined) {
                get_tar_function(received_obj["tar_parts"]);
              }
            });
          }

          async function get_tar_function(tar_parts) {
            //TODO: тут логика отправки Архива
            console.log("---------TAR----------");

            let this_ip = connection.remoteAddress
              .substr(7)
              .replace(/[\x00-\x1F\x7F-\x9F]/g, "");

            let finduser = await getElement(this_ip);
            let length = CUTED_TAR.length;
            if (
              finduser["tar_permission"] == true &&
              finduser["tar_have"] == false
            ) {
              for (let key in CUTED_TAR) {
                let sendobj = {
                  type: "server_get_TAR",
                  name: tar_name,
                  data: CUTED_TAR[key],
                  length: CUTED_TAR.length,
                  hash: TAR_HASH,
                  part: key,
                };

                if (tar_parts[tar_name] == undefined) {
                  tar_parts[tar_name] = {};
                }

                console.log("TAR___PARTS1_____", tar_parts, tar_name, key);
                console.log("TAR___PARTS2_____", tar_parts[tar_name], key);
                console.log(
                  "TAR___PARTS2_____",
                  tar_parts[tar_name][key.toString()]
                );

                if (tar_parts[tar_name][key.toString()] == undefined) {
                  await timer(200).then(async function () {
                    connection.sendUTF(JSON.stringify(sendobj));
                    console.log("TAR_part", key, " SEND TO ", this_ip);
                  });
                }
              }            
              console.log("SEND TO " + this_ip, "HEARE", length);            
            }

            console.log("---------------------------");
          }

          if (received_obj["type"] == "have_tar") {
            console.log("_____HAVE TAR____________");
            let this_ip = connection.remoteAddress
              .substr(7)
              .replace(/[\x00-\x1F\x7F-\x9F]/g, "");

            await setElement(this_ip, {
              tar_have: true,
              tar_permission: false,
            });
          }
          if (received_obj["type"] == "client_slave_have_tar") {
            console.log("_____SLAVE HAVE TAR____________");
            let this_ip = received_obj["data"]["ip"];

            await setElement_Slave(this_ip, {
              tar_hash: received_obj["data"]["hash"],
              tar_update_date: Curent_Date(),
            });
          }

          /******************************* ******************************/
          if (received_obj["type"] == "get_files_list") {
            let sendobj = {
              type: "files_on_server",
              server_timestamp: Server_timestamp,
              files: getlVL1_Files_with_hash(filesfoulder),
            };

            let logstr =
              "\n" +
              connection.remoteAddress
                .substr(7)
                .replace(/[\x00-\x1F\x7F-\x9F]/g, "") +
              "    " +
              JSON.stringify(sendobj) +
              "\n";

            connection.sendUTF(JSON.stringify(sendobj));
          }
          /******************************* files_on_master_client ******************************/
          if (received_obj["type"] == "files_on_master_client") {
            let this_ip = connection.remoteAddress
              .substr(7)
              .replace(/[\x00-\x1F\x7F-\x9F]/g, "");
            console.log("files_on_master_client_______________");
            console.log(received_obj["data"]);
            setElement(this_ip, { files_info: received_obj["data"] });
          }

          /******************************* Client_master_need_files ******************************/

          if (received_obj["type"] == "Client_master_need_files") {
            console.log(
              "Client_master_need_files_______________________",
              connection.remoteAddress
                .substr(7)
                .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
            );
            console.log(received_obj["files"]);

            if (received_obj["files_parts"] == undefined) {
              received_obj["files_parts"] = {};
            }
            console.log(received_obj["files"], received_obj["files_parts"]);

            //TODO: тут логика для отправки недостающих файлов
            console.log("---------NEED FILES----------");
          
            for (let file of received_obj["files"]) {
              {
                if (err) {
                  console.log(err);
                }
                console.log(
                  "LOADED==",
                  file,
                  CUTED_FILES[file]["length"],
                  CUTED_FILES[file]["length"] > 1200000
                );
                if (CUTED_FILES[file]["length"] > 1200000) {
                  let cuted = CUTED_FILES[file]["parts"];
                  console.log(cuted.length);

                  let testlength = 0;
                  const hash = CUTED_FILES[file]["hash"];
                  for (let key in cuted) {
                    let sendobj = {
                      type: "upload_big_file",
                      name: file,
                      data: cuted[key],
                      elementlength: cuted[key].length,
                      length: cuted.length,
                      part: key,
                      hash: hash,
                    };

                    if (received_obj["files_parts"][file] != undefined) {
                      console.log(
                        "+++++++++++++++++++++++++++++++",
                        parseInt(key)
                      );
                      console.log(
                        "+++++++++++++++++++++++++++++++",
                        received_obj["files_parts"][file]
                      );

                      if (
                        received_obj["files_parts"][file][parseInt(key)] ==
                        undefined
                      ) {
                        //FIXME:
                        connection.sendUTF(JSON.stringify(sendobj));
                        testlength = testlength + cuted[key].length;
                        console.log(
                          "SEND",
                          key,
                          testlength,

                          CUTED_FILES[file]["length"],
                          cuted[key].length
                        );
                      }
                    } else {
                      connection.sendUTF(JSON.stringify(sendobj));
                      testlength = testlength + cuted[key].length;
                      console.log(
                        "SEND",
                        key,
                        testlength,
                        CUTED_FILES[file]["length"],
                        cuted[key].length
                      );
                    }
                  }
                } else {
                  const hash = CUTED_FILES[file]["hash"];

                  console.log("SMALLL____________________");
                  console.log(Object.keys(CUTED_FILES[file]["parts"]));
                  let sendobj = {
                    type: "upload_big_file",
                    name: file,
                    data: CUTED_FILES[file]["parts"][0],
                    elementlength: CUTED_FILES[file]["length"],
                    length: 1,
                    part: 0,
                    hash: hash,
                  };

                  connection.sendUTF(JSON.stringify(sendobj));
                  console.log("SEND");
                }
              }           
            }

            console.log("---------------------------");
          }
        

          /******************************* ******************************/
          if (received_obj["type"] == "get_slave_info") {
            console.log("_____get_slave_info____________");
            let conectedciosc = await getElement_Slave(
              received_obj["data"]["ip"]
            );
            console.log(conectedciosc);
            let sendobj = {
              type: "slave_info_from_server",
              data: conectedciosc,
            };

            connection.sendUTF(JSON.stringify(sendobj));
            console.log("___________________________");
          }
        } else if (message.type === "binary") {
          console.log(
            "Received Binary Message of " + message.binaryData.length + " bytes"
          );
        }
      });

      connection.on("close", function (reasonCode, description) {
        let this_ip = connection.remoteAddress
          .substr(7)
          .replace(/[\x00-\x1F\x7F-\x9F]/g, "");
        console.log(new Date() + " Peer " + this_ip + " disconnected.");

        var myquery = { _id: this_ip };
        console.log("myquery=", myquery);

        var newvalues = { $set: { working: false } };
        collection_masters.updateOne(myquery, newvalues, function (err, res) {
          if (err) throw err;
          console.log("1 document updated");
        });
      });
    });
  });
}

async function Startprogram() {
  await read_files().then(async () => await WORKING_SERVER());
}

Startprogram();
