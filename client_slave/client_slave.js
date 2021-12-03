const WebSocketClient = require("websocket").client;
const request = require("request");
const fs = require("fs");
const cp = require("child_process");
const md5File = require("md5-file");
const tar = require("tar-fs");
var ip = require('ip');
const exec = require("child_process").exec;

//const http = require('http');
var client = new WebSocketClient();

let settings = JSON.parse(fs.readFileSync("settings.json"));
console.log(settings);
const port = settings["port"];



let myip=ip.address().split(".")

//let connect_ip=myip[0]+"."+myip[1]+"."+myip[2]+".33"


let connect_ip="";
if(settings["connect_ip"]=="")
{ connect_ip = myip[0]+"."+myip[1]+"."+myip[2]+".33"

settings["connect_ip"]=connect_ip;
}
else
{connect_ip = settings["connect_ip"];}
console.log("Connect IP = ",connect_ip)


//let connect_ip=settings["connect_ip"];




const filefoulder = settings["filefoulder"] + "/";
const tarfoulder = settings["tarfoulder"] + "/";
const execute_script = settings["execute_script"];
const stoplist = settings["stoplist"];

//const tarfoulder = process.cwd() + settings["tarfoulder"];
//const execute_script = process.cwd() + settings["execute_script"];
const cmd = settings["cmd"];

let testlengrh = 0;
let timestamp_on_server = new Date().getTime();

/*
const port = 2225;
const connect_ip="192.168.0.104"
//const connect_ip = "172.21.17.28";
const filefoulder = "files/";
const tarfoulder=process.cwd()+"/TAR/"
const execute_script=process.cwd()+"/TAR/teacher.js"*/

async function UNTAR(arvhive_name, unzip_path) {
  fs.createReadStream(arvhive_name).pipe(tar.extract(unzip_path));
  //RUN_JS()
}
function RUN_JS() {
  if (fs.existsSync(execute_script)) {
    let n = cp.fork(execute_script);
  } else {
    setTimeout(RUN_JS, 5000);
  }
}
function EXECUTE_COMAND() {
  exec(cmd, function (error, stdout, stderr) {});
}
/*
let Gettimestamp = function () {
  return new Date().getTime();
};*/
let Gettimestamp = function () {
  return timestamp_on_server;
};
/*var getlVL1_Files = function (dir, serverARR, emediatly_download, files_) {
  files_ = files_ || [];
  var files = fs.readdirSync(dir);
  for (var i in files) {
    var name = dir + "/" + files[i];
    if (fs.statSync(name).isDirectory()) {
    } else {
      // console.log("----fileinfo-----")
      let ext = files[i].split(".")[1];
      //let filename = files[i].split(".")[0].split("_")[0];

      let filename2 = files[i].split(".")[0].split("_");
      let str = "";

      for (let i = 0; i < filename2.length - 1; i++) {
        str = str + filename2[i];

        if (i + 1 != filename2.length - 1) {
          str = str + "_";
        }
      }
      let filename = str;

      let filetimestamp = parseInt(
        files[i].split(".")[0].split("_")[
          files[i].split(".")[0].split("_").length - 1
        ]
      );
      let timestamp = parseInt(Gettimestamp());

      console.log(
        "TEST HEARE____________",
        (filename + "." + ext),
        parseInt(timestamp),
        parseInt(filetimestamp),
        timestamp - filetimestamp,
        (timestamp - filetimestamp < 86400000)
      );
       
      if(serverARR.includes(filename + "." + ext))
      {

          if(emediatly_download==true)
          {fs.unlinkSync(filefoulder + files[i]);   }

        else if (timestamp - filetimestamp < 86400000) {
          files_.push(filename + "." + ext);
        } else {         
            fs.unlinkSync(filefoulder + files[i]);        
        }
      }
      else  if (stoplist.includes(filename + "." + ext) ) {
        files_.push(filename + "." + ext);
      }
      else
      {
        fs.unlinkSync(filefoulder + files[i]);
      }
      
    }
  }
  return files_;
};*/
var getlVL1_Files = function (dir, serverARR, files_) {
  files_ = files_ || [];
  var files = fs.readdirSync(dir);
  for (var i in files) {
    var name = dir + "/" + files[i];
    if (fs.statSync(name).isDirectory()) {
    } else {
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

      console.log(
        "FILES_____",
        filename + "." + ext,
        md5File.sync(dir + "/" + files[i]),
        serverARR[filename + "." + ext],
        stoplist.includes(filename + "." + ext)
      );
      if (
        md5File.sync(dir + "/" + files[i]) == serverARR[filename + "." + ext]
      ) {
        files_.push(filename + "." + ext);
      } else if (stoplist.includes(filename + "." + ext)) {
        files_.push(filename + "." + ext);
      } else {
        fs.unlinkSync(filefoulder + files[i]);
      }
    }
  }
  return files_;
};
/*
async function Getinfo() {
  let obj = {
    ip: "127.0.0.1",
    MTI: "SLAVE",
    city: "ANOR LONDO",
    info: "http://10.18.0.181:7080/kvinto/in",
  };
  return obj;
}*/


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

          console.log("=========================")
console.log(body)

          console.log("=========================")

          let obj = {
            ip: (body[0].replace(/[\x00-\x1F\x7F-\x9F]/g, "").replace(" ", "").toString()),
            MTI:  body[1],
            city:  body[2],
            info:  body[3]
          };

          res(obj);
        }
      }
    )
  );
  
  //return body["GOODS"].split(",");
  return body;
}

let BIG_Files = {};
let TAR_File = {};

function clear_files() {
  BIG_Files = {};
}
function clear_tar() {
  TAR_File = {};
}

async function TestConnect() {
  client.on("connectFailed", function (error) {
    console.log("Connect Error: " + error.toString());

    client.connect("ws://" + connect_ip + ":" + port, "echo-protocol");
  });

  client.on("connect", function (connection) {
    console.log("WebSocket Client Connected");
    let BIG_Files = {};
    let TAR_File = {};
    connection.on("error", function (error) {
      console.log("Connection Error: " + error.toString());
    });
    connection.on("close", function () {
      console.log("echo-protocol Connection Closed");
      client.connect("ws://" + connect_ip + ":" + port, "echo-protocol");
    });
    connection.on("message", async function (message) {
      if (message.type === "utf8") {
        let reseivedOBJ = JSON.parse(message.utf8Data);
        console.log(reseivedOBJ["type"]);

        if (reseivedOBJ["type"] == "test") {
          console.log("TEST___________________", reseivedOBJ);
        }

        if (reseivedOBJ["type"] == "script_run") {
          console.log("RUN JS___________________");
          RUN_JS();
        }

        if (reseivedOBJ["type"] == "uploadTAR") {
          //TODO:saveTAR

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
                  let tarhash=hash
                  UNTAR(tarfoulder + newfilename, tarfoulder).then(function () {
                    fs.unlinkSync(tarfoulder + newfilename);
                  }).then(()=>{HAVE_TAR(tarhash)});
                  TAR_File = {};
                  //fs.unlinkSync(tarfoulder + newfilename);
                 // HAVE_TAR();//:FIXME:
                } else {
                  console.log("UNLINK");
                  fs.unlinkSync(tarfoulder + newfilename);
                }

                delete TAR_File[reseivedOBJ["name"]];
                TAR_File = {};
              }
            );
          }
        } else {
        }
      } else if (message.type === "binary") {
        console.log(
          "Received Binary Message of " + message.binaryData.length + " bytes"
        );
        connection.sendBytes(message.binaryData);
      }
    });

    async function HELLOW_Connetion() {
      let answer = "ok";
      if (connection.connected) {
        await Getinfo().then(function (infoobj) {
          if (infoobj["error"] == undefined) {
            infoobj["haveInfo"] = true;
            console.log("VALUE= ", infoobj); // \u0423\u0441\u043f\u0435\u0445!
            let sendobj = { type: "slave-connection", data: infoobj };
            connection.send(JSON.stringify(sendobj));
          } else {
            let sendobj = {
              type: "slave-connection",
              data: { MTI: "", city: "", haveInfo: false },
            };
            connection.send(JSON.stringify(sendobj));

            answer = "error";
          }
        });
      }
      return answer;
    }
    function GET_fouldsers_request() {
      if (connection.connected) {
        let sendobj = { type: "get_foulders_structure" };
        connection.send(JSON.stringify(sendobj));
      }
    }
    function Update_files_request() {
      if (connection.connected) {
        let sendobj = { type: "get_content_files" };
        connection.send(JSON.stringify(sendobj));
      }
    }
    function GET_TAR_request() {
      if (connection.connected) {
        let sendobj = { type: "get_tar" };
        connection.send(JSON.stringify(sendobj));
      }
    }
    function HAVE_TAR(tarhash) {
      
      if (connection.connected) 
      {
        
       
        let sendobj = { type: "slave_have_tar",data:{"hash":tarhash} };
       
        connection.send(JSON.stringify(sendobj));

        console.log("EXEC____");
        RUN_JS();
      }
    }

    async function Check_Files() {
      let files = await getlVL1_Files_with_checksum(filefoulder);

      console.log("---------------CHECK FILES---------------");

      if (connection.connected) {
        let sendobj = { type: "check_files", data: files };
        connection.send(JSON.stringify(sendobj));
      }
    }

    function STARTPROGRAM() {
      HELLOW_Connetion().then(function (_info) {
        if (_info == "ok") {
          //GET_TAR_request();
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

  //client.connect("ws://localhost:"+port, "echo-protocol");

  client.connect("ws://" + connect_ip + ":" + port, "echo-protocol");
}

TestConnect();
