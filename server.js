const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const connection = require("./connection");
const jwt = require("jsonwebtoken");
const bcrypt = require('bcryptjs');

const path = require('path')

const multer = require("multer");
const { async } = require("postcss-js");
const e = require("express");
const { createLogger } = require("vite");

const app = express();
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use("/public/img/",express.static("./public/img"));

const storage = multer.diskStorage({
    destination: function (req, file, cb){
        return cb(null, './public/img')
    },
    filename: function(req, file, cb){
        return cb(null, `${req.body.uname}${path.extname(file.originalname)}`)
    }
})

const upload = multer({storage});

let patientDetails;
let imageExt;
let docDepartment;

connection.connect(function (err) {
  if (err) {
    console.log(err)
  }
  console.log("connection created with Mysql successfully");
});

// app.get("/doctor", function (req,res){
//   res.render("docter");
// })

// Doctor

app.get("/doctor", function(req,res){
  res.render("Doctor_index");
})


// Home page 

app.get("/home", function(req,res){
  res.render("index");
})

// Login 

app.get("/login", function(req,res){
  res.render("logins");
})

// Patient Login

app.get("/pLogin",function(req,res){
  res.render("patientLogin", {message: undefined});
})

app.post("/pLogin", function(req,res){

  let {uname, pass} = req.body;
  connection.query(`select * from patient where puname = '${uname}'`, function(error,result){
    if(error) console.log(error);

    console.log(result)

    if(result.length > 0){
      if(bcrypt.compare(pass,result[0].ppass)){
        console.log("User logged in")
        patientDetails = result;
        imageExt = path.extname(result[0].imageUrl);
        res.render("welcome", { patientDetails: result, extension: path.extname(result[0].imageUrl)});
      }
      else{
        console.log("Worng pass");
        res.render("patientLogin", {message: "Worng password"})
      }
    }
    else{
      res.render("patientLogin",{message: "Patient not found"});
    }
  })
})

// Patient Register

app.get("/pReg",function(req,res){
  res.render("patientReg", {message: undefined});
})

app.post("/pReg", upload.single("image") ,function(req,res){

  let name = req.body.name;
  let uname = req.body.uname;
  let email = req.body.email;
  let pass = req.body.pass;
  let confirmPass = req.body.confirmPass;
  let phone = req.body.phone_number;
  let Gender = req.body.gender;
  let address = req.body.address;
  let birthDate = req.body.birthDate;

  console.log(Gender);

  let imageUrl = req.file.originalname;

  connection.query(`select pemail from patient where pemail = '${email}'`, async function(err,result){
    if(err) console.log(err);

    // console.log(result)

    if(result.length > 0){
      return res.render('patientReg', {message:'The email is already taken'});
    }
    let hashedpass = await bcrypt.hash(pass, 8);
    console.log(hashedpass);

    connection.query(`insert into patient(pemail,ppass,imageUrl,puname,pname,phone,Gender,BirthDate,address) values('${email}','${hashedpass}','${imageUrl}','${uname}','${name}','${phone}','${Gender}','${birthDate}','${address}')`, function(err,result){
      if(err) {
        console.log(err)
      }
      else{
        console.log(result);
        return res.render("patientReg", {message: "User Registered"})
      }
    })
    
  })

  // connection.query(`insert into patient(pemail,ppass,imageUrl,puname,pname) values('${email}','${pass}','${imageUrl}','${uname}','${name}')`, function(err,result){
  //   if(err) console.log(err)
  //   console.log(result);
  // })
  
  // res.redirect("/pLogin");
})

// Patient Welcome :

app.get('/welcome', function(req,res){
  res.render("welcome", { patientDetails: patientDetails, extension: path.extname(patientDetails
    [0].imageUrl)});
})

// Update Details :

app.get('/updatedDetails', function(req,res){
  
  console.log(patientDetails);
  res.render('editprofile', {patientD: patientDetails, img: imageExt});
})

app.post('/updatedDetails', function(req,res){

  let name = req.body.name;
  let uname = req.body.uname;
  let email = req.body.email;
  let phone = req.body.phone_number;
  let Gender = req.body.gender;
  let address = req.body.address;
  let birthDate = req.body.birthDate;

  // console.log(req.body);

  console.log(patientDetails);

  connection.query(`UPDATE patient
  SET pemail = '${email}', puname = '${uname}', pname = '${name}', phone = '${phone}', Gender = '${Gender}', BirthDate = '${birthDate}', address = '${address}' 
  WHERE p_id = '${patientDetails[0].p_id}'`, function(error,result){
    if(error) console.log(err);
    
    connection.query(`select * from patient where p_id = '${patientDetails[0].p_id}'`, function(err,result){
      if(err) console.log(err);
      patientDetails = result;
    })
    res.redirect("/welcome");
  });
})

// Book Appointment :

app.get('/appointment', function(req,res){
  
  connection.query(`select distinct department from doctor`,function(err,result){
    if(err) console.log(err);
    docDepartment = result;
    res.render("bookap",{dep:result,patientD: patientDetails, img: imageExt});
  })

})

app.post('/enableDoc', function(req,res){
  let dep = req.body.department;
  connection.query(`select * from doctor where department = '${dep}'`, function(err,result){
    res.render('bookap1', {department: dep, patientD: patientDetails, img: imageExt,docDetails: result, dep: docDepartment});
  });
})

// View Doctor
app.get("/viewDoc", function(req,res){

//   connection.query(`select * from doctor where department = ${dep}`, function(err,result){
//     if(err) console.log(err);
//   })

  connection.query(`select distinct department from doctor`, function(err,result){
    if(err) console.log(err);
    console.log(result)
    res.render("viewdoctor", {dep:result,patientD: patientDetails, img: imageExt});

  })

})

app.post("/viewDoc", function(req,res){

    let dep = req.body.specialty;

    let department;

    connection.query(`select distinct department from doctor`, function(err,result){
      if(err) console.log(err);
      console.log(result)
      department = result;
    })

    connection.query(`select * from doctor where department = "${dep}"`, function(err,result){
        if(err) console.log(err);
        console.log(result);
        
        res.render("viewDoctor_after", {doctorDetails:result,depa:department, patientD: patientDetails, img: imageExt});
    })
})

// View Profile

app.get("/dprofile", function(req,res){

  res.render("dprofile");
})

// Docter Register

app.get("/doctorReg", function(req,res){

  res.render("dregister");
})

app.post("/doctorReg", upload.single("image") ,function (req,res){

  let uname = req.body.uname;
  let dname = req.body.dname;
  let dep = req.body.dep;
  let ddesc = req.body.ddesc;
  let fileName = req.file.originalname;

  // console.log(req.body);
  // console.log(req.file);

  connection.query(`insert into doctor(d_id, dname, department, img, ddesc) values('${uname}','${dname}','${dep}','${fileName}','${ddesc}');`, function (err, result, fields) {
    if(err){
      console.log(err);
    }
    console.log(result);
  });

  console.log(uname);
  res.render("dregister");
  
})



// Patient Login 
    
app.post("/docDetails", function(req,res){

  const d_id = Object.keys(req.body)[0];
  console.log(d_id)
  
  connection.query(`select * from doctor where d_id = "${d_id}";`, function(err,result){

    res.render("dprofile", {docRes: result, extension:path.extname(result[0].img), pDetails: patientDetails, ext: imageExt});
  })
})


// app.get('/patient', function(req,res){

//   connection.query('SELECT * FROM appointment ORDER BY date, timeSlot', function(err,result, fields){
//     if(err) console.log(err)
//     res.render("patient", {patient:result})
//   })

// })

// app.post("/patient", function(req,res){

//   var cancer = req.body.cancer
//   var dental = req.body.dental
//   var mental = req.body.mental
//   var all = req.body.all

//   if(cancer != undefined){
//     connection.query(`select * from appointment where department='Cancer'`, function (err, result, fields) {
//       if(err){
//         console.log(err);
//       }
//       console.log(result);
//       res.render("patient", {patient:result});
//     });
//   }

//   if(dental != undefined){
//     connection.query(`select * from appointment where department='Dental'`, function (err, result, fields) {
//       if(err){
//         console.log(err);
//       }
//       console.log(result);
//       res.render("patient", {patient:result});
//     });
//   }

//   if(mental != undefined){
//     connection.query(`select * from appointment where department='Mental'`, function (err, result, fields) {
//       if(err){
//         console.log(err);
//       }
//       console.log(result);
//       res.render("patient", {patient:result});
//     });
//   }

//   if(all != undefined){
//     connection.query(`SELECT * FROM appointment ORDER BY date, timeSlot`, function (err, result, fields) {
//       if(err){
//         console.log(err);
//       }
//       console.log(result);
//       res.render("patient", {patient:result});
//     });
//   }
// })

// app.post("/appointment", function (req, res) {

//     var name = req.body.name
//     var mobile = req.body.mobile
//     var date = req.body.date
//     var dep = req.body.dep
//     var time = req.body.time

//     connection.query(`insert into appointment(name,mobile,date,department,timeSlot) values('${name}','${mobile}','${date}','${dep}','${time}');`, function (err, result, fields) {
//       if(err){
//         console.log(err);
//       }
//       console.log(result);
//     });

//     res.redirect('/appointment');
// });

app.listen(3000, () => {
  console.log("Server running on port 3000");
});