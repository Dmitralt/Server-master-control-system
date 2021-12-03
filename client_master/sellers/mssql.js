const sql = require("mssql");
const fs = require("fs");

let config = {
  user: "ikUser",
  password: "1kUser",
  server: "172.30.195.1",
  database: "MegaShop",
  options: {
    cryptoCredentialsDetails: {
        minVersion: 'TLSv1'
    }
}
};

async function SQLQUERY(updated_files) {
  sql.on("error", (err) => {
    console.log("connection error");
  });

  sql
    .connect(config)
    .then((pool) => {
      // Query

    return pool
        .request()
        .query(`SELECT SHOPS_ID from SHOPS WHERE SHOPS_OUT = 'MECKV14'`)
        .then((data) => {
          console.dir(data.recordset[0]["SHOPS_ID"], "RESULT1");
          pool
            .request()
            .input("SHOPS_ID", sql.Int, data.recordset[0]["SHOPS_ID"])
            .execute("spIK2_UsersByShop")
            .then((respdata) => {
              if(respdata["recordset"]!=undefined)
              { let newdata = {};

              for (let elem of respdata["recordset"]) {
                newdata[elem["USERS_ID"]] = elem["USERS_NAME"];
              }
             // console.log(updated_files);
             
              for (let file of updated_files) {

                //console.log(file)
                fs.writeFileSync(file, JSON.stringify(newdata));
              }
              console.log("done_____")}
            });
        });
    })
    .then((result) => {
      //   console.dir(result.recordset[0]["SHOPS_ID"], "RESULT1")
    })
    .catch((err) => {
      console.log("sql connect error",err);
      
    });

      
}

var getlVL1_Files = function (dir) {
  let answer = [];
  var files = fs.readdirSync(dir);

  for (var i in files) {
    var name = dir + "/" + files[i];
    if (fs.statSync(name).isDirectory()) {
    } else {
      let ext = files[i].split(".")[1];

      let filename2 = files[i].split(".")[0].split("_");
      let str = "";

      if ((filename2[0] == "out", filename2[1] == "sellers")) {
        answer.push(dir + "/" + files[i]);
      }
    }
  }
  return answer;
};


async function WORKING() {
  let files1 = getlVL1_Files("/usr/src/app/lockalServer/sync-module/existent/db/");
  let files2 = getlVL1_Files("/usr/src/app/lockalServer/sync-module/existent/reserv_date__");

  let files=files1
  for(let element of files2)
  {
    files.push(element)
  }
 console.log(files)
 console.log("______")
 
 
 
  SQLQUERY(files);
}

WORKING();
