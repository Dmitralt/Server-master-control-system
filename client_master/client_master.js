const WebSocketClient = require("websocket").client;
var WebSocketServer = require("websocket").server;
const request = require("request");
const fs = require("fs");
const cp = require("child_process");
const md5File = require("md5-file");
const tar = require("tar-fs");
var http = require("http");
const exec = require("child_process").exec;

var client = new WebSocketClient();

let settings = JSON.parse(fs.readFileSync("settings.json"));
console.log(settings);
const server_port = settings["server_port"];
const master_port = settings["master_port"];
const connect_ip = settings["connect_ip"];
const filefoulder = settings["filefoulder"] + "/";
const tarfoulder = settings["tarfoulder"] + "/";
const execute_script = settings["execute_script"];
const stoplist = settings["stoplist"];
const filesfoulder = settings["filesfoulder"];

const tar_name = settings["tar_name"];
const tar_foulder = settings["tar_foulder"];
const corrupted_timer = settings["corrupted_timer"];
const archive_foulder = settings["archive_foulder"];
const tar_timeout = settings["tar_timeout"];

const tar_path = process.cwd() + tar_foulder + tar_name;

function SetPermissions()
{
  //exec("echo pa$$w0rd | sudo -S chmod -R 777 "+settings["tarfoulder"], function (error, stdout, stderr) {});
  //exec("echo pa$$w0rd | sudo -S chmod -R 777 "+settings["filefoulder"], function (error, stdout, stderr) {});  
 //exec("echo pa$$w0rd | sudo -S chown kp-player -R "+settings["tarfoulder"], function (error, stdout, stderr) {});
  //exec("echo pa$$w0rd | sudo -S chown kp-player -R "+settings["filefoulder"], function (error, stdout, stderr) {});
}
SetPermissions();

const cmd = settings["cmd"];
let CLIENTS_SLAVES = {};
let timestamp_on_server = new Date().getTime();
let CUTED_TAR;
let reloadedFiles = {};


let BIG_Files = {};
let TAR_File = {};

let global_client_connect = "";


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

async function UNTAR(arvhive_name, unzip_path) {
  fs.createReadStream(arvhive_name).pipe(tar.extract(unzip_path));
  //RUN_JS()
}
function timer(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function RUN_JS() {
  if (fs.existsSync(execute_script)) {
    let n = cp.fork(execute_script);
  } else {
    setTimeout(RUN_JS, 5000);
  }
}
function EXECUTE_COMAND() {
  SetPermissions()
  exec(cmd, function (error, stdout, stderr) {});
}
function Request_Slave_info(ciosc_IP) {
  if (global_client_connect.connected) {
    let sendobj = { type: "get_slave_info", data: { ip: ciosc_IP } };
    global_client_connect.send(JSON.stringify(sendobj));
  }
}
let Gettimestamp = function () {
  return timestamp_on_server;
};

/*_Send TAR to ciosc */

async function give_TAR_to_ciosc(Ciosc_ip) {
  const hash = md5File.sync(tar_path);

  console.log("CUTED_TAR.length ",CUTED_TAR.length);

  for (let key in CUTED_TAR) {
    let sendobj = {
      type: "uploadTAR",
      name: tar_name,
      data: CUTED_TAR[key],
      length: CUTED_TAR.length,
      hash: hash,
      part: key,
    };

    await timer(1000).then(async function () {
      if (CLIENTS_SLAVES[Ciosc_ip] != undefined) {
        CLIENTS_SLAVES[Ciosc_ip].sendUTF(JSON.stringify(sendobj));
      }
      console.log(key);
    });
  }
  console.log("TAR SEND TO ", Ciosc_ip);
}
///////

var getlVL1_Files = function (dir, files_) {
  files_ = files_ || [];
  var files = fs.readdirSync(dir);
  for (var i in files) {
    var name = dir + "/" + files[i];
    if (fs.statSync(name).isDirectory()) {
    } else {
      // files_.push(files[i]);

      let ext = files[i].split(".")[1];

      let filename2 = files[i].split(".")[0].split("_");
      let str = "";

      for (let i = 0; i < filename2.length - 1; i++) {
        str = str + filename2[i];

        if (i + 1 != filename2.length - 1) {
          str = str + "_";
        }
      }
      let filename = str;

      if (
        stoplist.includes(filename + "." + ext) == false &&
        stoplist.includes(files[i]) == false
      ) {
        files_.push({
          servername: filename + "." + ext,
          filename: files[i],
          hash: md5File.sync(dir + "/" + files[i]),
        });
      }
    }
  }
  return files_;
};

//TODO: For develop
async function Getinfo() {
  let obj = {
    ip: "127.0.0.1",
    MTI: "MECKV01",
    city: "KV",
    info: "http://10.18.0.181:7080/kvinto/in",
  };
  return obj;
}

//TODO: For prod
/*
async function Getinfo() {
  var data = {};
  let body = await new Promise((res) =>
    request.get(
      "http://localhost:3131/",
      { json: data, headers: {}, timeout: 15000 },
      function (error, response, body) {
        if (error) {
          res({ error: "timeout" });
        } else {
          console.log("=========================");
          console.log(body);

          console.log("=========================");

          let obj = {
            ip: body[0]
              .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
              .replace(" ", "")
              .toString(),
            MTI: body[1],
            city: body[2],
            info: body[3],
          };

          res(obj);
        }
      }
    )
  );

  //return body["GOODS"].split(",");
  return body;
}*/


var server = http.createServer(function (request, response) {
  console.log(new Date() + " Received request for " + request.url);
  response.writeHead(404);
  response.end();
});

server.listen(master_port, function () {
  console.log(new Date() + " Server is listening on port" + master_port);
 /* tar
    .pack(process.cwd() + archive_foulder)
    .pipe(fs.createWriteStream(process.cwd() + tar_foulder + tar_name));*/

  //Archive_hash = md5File.sync(process.cwd() + tar_foulder + tar_name);//FIXME:
});

wsServer = new WebSocketServer({
  httpServer: server,

  autoAcceptConnections: false,
});

function originIsAllowed(origin) {
  return true;
}
/*----------CLIENT PART-------------- */
client.on("connectFailed", function (error) {
  console.log("Connect Error: " + error.toString());

  client.connect("ws://" + connect_ip + ":" + server_port, "echo-protocol");
});

client.on("connect", function (client_connection) {

  console.log("WebSocket Client Connected");  
  
  client_connection.on("error", function (error) {
    console.log("Connection Error: " + error.toString());
  });



  client_connection.on("close", function () {
    console.log("echo-protocol Connection Closed");
    client.connect("ws://" + connect_ip + ":" + server_port, "echo-protocol");
  });


  global_client_connect = client_connection;


  client_connection.on("message", async function (message) {
    if (message.type === "utf8") {
      let reseivedOBJ = JSON.parse(message.utf8Data);
      console.log(reseivedOBJ["type"]);

      if (reseivedOBJ["type"] == "server_script_run") {
        console.log("RUN JS___________________");
        RUN_JS();
      }

      if (reseivedOBJ["type"] == "slave_info_from_server") {
        console.log("_____get_slave_info_from_server____________");

        console.log(reseivedOBJ);

        let sendobj = { type: "test", data: reseivedOBJ["data"] };

        CLIENTS_SLAVES[reseivedOBJ["data"]["_id"]].send(
          JSON.stringify(sendobj)
        );

        console.log("___________________________________________");

        if (
          (md5File.sync(tar_path) != reseivedOBJ["data"]["tar_hash"]) &
          reseivedOBJ["data"]["tar_permission"]
        ) {
          fs.readFile(tar_path, async function (err, data) {
            CUTED_TAR = chunkString(data.toString("base64"), 1200000);
            give_TAR_to_ciosc(reseivedOBJ["data"]["_id"]);
          });
          global_client_connect.send(
            JSON.stringify({
              type: "send_tar_to_client",
              data: { ip: reseivedOBJ["data"]["_id"] },
            })
          );
        }
      }

      /************************ files_on_server ******************************* */
      if (reseivedOBJ["type"] == "files_on_server") {
        //TODO:create dir
        console.log("----------------Files on Server----------------");
        console.log("SERVER-  ", reseivedOBJ["files"]);

        timestamp_on_server = reseivedOBJ["server_timestamp"];
       
        let Client_master_files = getlVL1_Files(filefoulder);
       
        let needARR = [];

        let files_on_master_client = [];
        for (let element of Client_master_files) {
          files_on_master_client.push(element["servername"]);
        
          if (
            Object.keys(reseivedOBJ["files"]).includes(element["servername"]) ==
            false
          ) {
            fs.unlinkSync(filefoulder + element["filename"]);
          } else {
           
            if (
              element["hash"] != reseivedOBJ["files"][element["servername"]]
            ) {
              needARR.push(element["servername"]),
                (reloadedFiles[element["servername"]] = element["filename"]);
            }
          }
         
        }
        let files_parts={};
        for (let element of Object.keys(reseivedOBJ["files"])) {
          if (files_on_master_client.includes(element) == false) {
            needARR.push(element);

         
           console.log("NEED FILE",element,"\n------")
           if(BIG_Files[element]!=null&&BIG_Files[element]!=undefined)
           {
             
            console.log("HAVE PARTS FILE", Object.keys(BIG_Files[element]),"\n")
            console.log(Object.keys(BIG_Files[element]["parts"]))

            let parts=[]

            for(let part_number of Object.keys(BIG_Files[element]["parts"]))
            {
              parts.push(parseInt(part_number))
            }

            files_parts[element]=parts

            console.log(files_parts)
            console.log("\n==================================================")
          
          
          }
          else
          {
            files_parts[element]={}
          }
           

          }
        }

        let sendobj = { type: "Client_master_need_files", files: needARR, files_parts:files_parts };
        global_client_connect.send(JSON.stringify(sendobj));
     
        console.log("----------------------------------------------");
      }

      /************************ upload_big_file ******************************* */

      if (reseivedOBJ["type"] == "upload_big_file") {
        console.log("----------------BIG FILE----------------");

        console.log(
          reseivedOBJ["name"],
          "length=",
          reseivedOBJ["length"],
          "part=",
          reseivedOBJ["part"]
        );

        if (BIG_Files[reseivedOBJ["name"]] == undefined) {
          testlengrh = 0;
          BIG_Files[reseivedOBJ["name"]] = {};
          BIG_Files[reseivedOBJ["name"]]["parts"] = {};
          BIG_Files[reseivedOBJ["name"]]["hash"] = reseivedOBJ["hash"];
          BIG_Files[reseivedOBJ["name"]]["length"] = reseivedOBJ["length"];
        }

        BIG_Files[reseivedOBJ["name"]]["parts"][reseivedOBJ["part"]] =
          reseivedOBJ["data"];

        if (
          Object.keys(BIG_Files[reseivedOBJ["name"]]["parts"]).length ==
          BIG_Files[reseivedOBJ["name"]]["length"]
        ) {
          console.log("--------------ALL PARTS HEARE-------------");

          let newOBJ = "";

          for (
            let i = 0;
            i < Object.keys(BIG_Files[reseivedOBJ["name"]]["parts"]).length;
            i++
          ) {
            newOBJ = newOBJ + BIG_Files[reseivedOBJ["name"]]["parts"][i];

           


            console.log(BIG_Files[reseivedOBJ["name"]]["parts"][i].length);
          }

          let filename = reseivedOBJ["name"].split(".")[0];
          let ext = reseivedOBJ["name"].split(".")[1];
          let timestamp = Gettimestamp();

          let newfilename = filename + "_" + timestamp + "." + ext;

          let testlength = newOBJ.length;
          console.log("SAVEFILE_____", filefoulder + newfilename, testlength);

          fs.writeFile(
            filefoulder + newfilename,
            Buffer.from(newOBJ, "base64"),
            function () {
              console.log("============================================");

              console.log(reloadedFiles);
              
              console.log(filefoulder + reloadedFiles[reseivedOBJ["name"]]);

              if (Object.keys(reloadedFiles).includes(reseivedOBJ["name"])) {
                fs.access(
                  filefoulder + reloadedFiles[reseivedOBJ["name"]],
                  fs.F_OK,
                  (err) => {
                    fs.unlinkSync(
                      filefoulder + reloadedFiles[reseivedOBJ["name"]]
                    );
                  }
                );
              }

              console.log("============================================");
              const hash = md5File.sync(filefoulder + newfilename);

           
              if (hash != BIG_Files[reseivedOBJ["name"]]["hash"]) {
                console.log("IF I REED THIS THEN ERROR");
                fs.unlinkSync(filefoulder + newfilename);
                let sendobj = {
                  type: "crashed_file",
                  filename: reseivedOBJ["name"],
                };
                BIG_Files[reseivedOBJ["name"]] = {};//IF file corupted - clean for new download
                connection.send(JSON.stringify(sendobj));
              } else {
                FILES_ON_MASTER();
                console.log("TESAT____Q!")
                if (reseivedOBJ["name"] == "out_goods.json") {
                  EXECUTE_COMAND();
                }
              }

              delete BIG_Files[reseivedOBJ["name"]];
              console.log("DONE");
            }
          );

        }
        //if (reseivedOBJ["name"]=="out_goods.json"){EXECUTE_COMAND()}
      }
      //////////////////////////////////////////////////////////////////////////////////////////
      if (reseivedOBJ["type"] == "server_get_TAR") {
        console.log("----------------SAVE TAR----------------");

        console.log(
          reseivedOBJ["name"],
          reseivedOBJ["length"],
          reseivedOBJ["part"]
        );

        if (TAR_File[reseivedOBJ["name"]] == undefined) {
          TAR_File[reseivedOBJ["name"]] = {};
          TAR_File[reseivedOBJ["name"]]["parts"] = {};
          TAR_File[reseivedOBJ["name"]]["hash"] = reseivedOBJ["hash"];
          TAR_File[reseivedOBJ["name"]]["length"] = reseivedOBJ["length"];
        }

        TAR_File[reseivedOBJ["name"]]["parts"][reseivedOBJ["part"]] =
          reseivedOBJ["data"];

        if (
          Object.keys(TAR_File[reseivedOBJ["name"]]["parts"]).length ==
          TAR_File[reseivedOBJ["name"]]["length"]
        ) {
          console.log("UNTAR___");

          let newOBJ = "";

          for (
            let i = 0;
            i < Object.keys(TAR_File[reseivedOBJ["name"]]["parts"]).length;
            i++
          ) {
            newOBJ = newOBJ + TAR_File[reseivedOBJ["name"]]["parts"][i];
          }
          let newfilename = reseivedOBJ["name"];

          console.log("WRITE_____", tarfoulder + newfilename);


        

          fs.writeFile(
            tarfoulder + newfilename,
            Buffer.from(newOBJ, "base64"),
            function () {
              const hash = md5File.sync(tarfoulder + newfilename);

              console.log(
                "FS TRY UNDERSTAND____",
                TAR_File[reseivedOBJ["name"]]["hash"],
                hash,
                TAR_File[reseivedOBJ["name"]]["hash"] == hash
              );

              if (TAR_File[reseivedOBJ["name"]]["hash"] == hash) {
                console.log("NOW UNTAR^^^^^^^^^^^^^^^^^");

                 UNTAR(tarfoulder + newfilename, tarfoulder).then(function () {
                  fs.writeFile( process.cwd() +tar_foulder + newfilename, Buffer.from(newOBJ, "base64"),function () { fs.unlinkSync(tarfoulder + newfilename);  TAR_File = {}; HAVE_TAR();})
                 
                });
               
              } else {
                console.log("UNLINK");
                fs.unlinkSync(tarfoulder + newfilename);
              }

              delete TAR_File[reseivedOBJ["name"]];
              TAR_File = {};
            }
          );
          
        }
      }
    } else if (message.type === "binary") {
      console.log(
        "Received Binary Message of " + message.binaryData.length + " bytes"
      );
      client_connection.sendBytes(message.binaryData);
    }
  });

  async function HELLOW_Connetion() {
    let answer = "ok";
    if (client_connection.connected) {
      await Getinfo().then(function (infoobj) {
        if (infoobj["error"] == undefined) {
          infoobj["haveInfo"] = true;
          console.log("VALUE= ", infoobj); // \u0423\u0441\u043f\u0435\u0445!
          let sendobj = { type: "client-master-connection", data: infoobj };
          client_connection.send(JSON.stringify(sendobj));

          console.log("***********************", Object.keys(CLIENTS_SLAVES));
          for (let key of Object.keys(CLIENTS_SLAVES)) {
            Request_Slave_info(key); //FIXME:
          }
        } else {
          let sendobj = {
            type: "client-master-connection",
            data: { MTI: "", city: "", haveInfo: false },
          };
          client_connection.send(JSON.stringify(sendobj));

          //console.log("Cant get Info");
          answer = "error";
        }
      });
    }
    return answer;
  }

  function Update_files_request() {
    if (client_connection.connected) {
      let sendobj = { type: "get_content_files" };
      client_connection.send(JSON.stringify(sendobj));
    }
  }
  function GET_TAR_request() {
    if (client_connection.connected) {

      let tar_parts={}

      console.log("_____TARTEST____")
      console.log(Object.keys(TAR_File),Object.keys(TAR_File).length==0)

      if(Object.keys(TAR_File).length!=0)
      {

        tar_parts[Object.keys(TAR_File)[0]]=Object.keys(TAR_File[Object.keys(TAR_File)[0]]["parts"])
      }


      console.log("___END TEST___")




      let sendobj = { type: "get_tar",tar_parts:tar_parts };





      client_connection.send(JSON.stringify(sendobj));
    }
  }
  function GET_FILES_request() {
    if (client_connection.connected) {
      reloadedFiles = {};
      let sendobj = { type: "get_files_list" };
      client_connection.send(JSON.stringify(sendobj));
    }
  }
  function FILES_ON_MASTER() {
    if (client_connection.connected) {
      let sendobj = {
        type: "files_on_master_client",
        data: getlVL1_Files(filefoulder),
      };
      client_connection.send(JSON.stringify(sendobj));
    }
  }
  function HAVE_TAR() {
    if (client_connection.connected) {
      let sendobj = { type: "have_tar" };
      client_connection.send(JSON.stringify(sendobj));
      RUN_JS();
      console.log("EXEC____");
      EXECUTE_COMAND();
    }
  }

  function STARTPROGRAM() {
    HELLOW_Connetion().then(function (_info) {
      if (_info == "ok") {
        FILES_ON_MASTER();
        GET_TAR_request();
        GET_FILES_request();


      }
      if (_info == "error") {
        console.log("ERROR. CANT GET INFO");
       
        setTimeout(STARTPROGRAM, 600000);
      }
    });
  }

  STARTPROGRAM();
});

client.onclose = function () {
  console.log("echo-protocol Client Closed");
};

client.connect("ws://" + connect_ip + ":" + server_port, "echo-protocol");

/*----------MASTER  PART-------------- */
wsServer.on("request", function (request) {
  if (!originIsAllowed(request.origin)) {
    request.reject();
    console.log(
      new Date() + " Connection from origin " + request.origin + " rejected."
    );
    return;
  }

  var server_connection = request.accept("echo-protocol", request.origin);
  global_server_connect = server_connection;
  console.log(new Date() + " Connection accepted.");
  let this_ip = server_connection.remoteAddress
    .substr(7)
    .replace(/[\x00-\x1F\x7F-\x9F]/g, "");

  CLIENTS_SLAVES[this_ip] = server_connection;
 

  server_connection.on("message", async function (message) {
    if (message.type === "utf8") {
      let received_obj = JSON.parse(message.utf8Data);
      if (received_obj["type"] == "slave-connection") {
        let this_ip = server_connection.remoteAddress
          .substr(7)
          .replace(/[\x00-\x1F\x7F-\x9F]/g, "");
        console.log(this_ip, " was connected");

        received_obj["data"]["ip"] = this_ip;

        let sendobj = {
          type: "client-slave-connection",
          data: received_obj["data"],
        };
        if (global_client_connect.connected) {
          global_client_connect.send(JSON.stringify(sendobj));
        }
        Request_Slave_info(this_ip);
      }
      if (received_obj["type"] == "slave_have_tar") {
        received_obj["data"]["ip"] = this_ip;
        let sendobj = {
          type: "client_slave_have_tar",
          data: received_obj["data"],
        };
        if (global_client_connect.connected) {
          global_client_connect.send(JSON.stringify(sendobj));
        }

        console.log("CIOSc ", this_ip, " have new TAR");
      }
    } else if (message.type === "binary") {
      console.log(
        "Received Binary Message of " + message.binaryData.length + " bytes"
      );
    }
  });

  server_connection.on("close", function (reasonCode, description) {
    let this_ip = server_connection.remoteAddress
      .substr(7)
      .replace(/[\x00-\x1F\x7F-\x9F]/g, "");

    delete CLIENTS_SLAVES[this_ip];
    let sendobj = {
      type: "client-slave-disconected",
      data: { disconectedIP: this_ip },
    };

    console.log(
      new Date() + " Peer " + this_ip + " disconnected.",
      CLIENTS_SLAVES
    );
    if (global_client_connect.connected) {
      global_client_connect.send(JSON.stringify(sendobj));
    }
  });
});
