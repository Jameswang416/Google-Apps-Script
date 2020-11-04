var spreadsheetId = 'xxxxxxxxxx'; //"CRUD" Spreadsheet Id

function doGet() {

	return HtmlService.createHtmlOutputFromFile('index');
}

function getEmail() {
	return Session.getActiveUser().getEmail();
}


function getParameters() {
	var ssFirst = SpreadsheetApp.openById(spreadsheetId);
	var ss = ssFirst.getSheetByName('Parameters');

	var data = ss.getDataRange().getValues();
	var data = data.filter(function (element) {
		return element.join("") != ""
	});


	return data;

}

function getData() {
	var ssFirst = SpreadsheetApp.openById(spreadsheetId); //Spreadsheet name;CRUD
	var ss = ssFirst.getSheetByName('Log');

	var data = ss.getDataRange().getValues();
	var data = data.filter(function (element) {
		return element.join("") != ""
	});
	for (var row = 1; row < data.length; row++) {


		data[row][0] = Utilities.formatDate(data[row][0], Session.getScriptTimeZone(), "M/d/yyyy"); // convert date to string
	}

	return data;

}

function getDataPage(pageNumber) { //  100 rows per page
	var ssFirst = SpreadsheetApp.openById(spreadsheetId); //Spreadsheet name;CRUD
	var ss = ssFirst.getSheetByName('Log');

	var lastRow = ss.getLastRow();
	if (lastRow > 101) {
		var bigPages = parseInt(lastRow / 100);
		var firstRow = lastRow - 100 * pageNumber + 1;
		var backward = true;
		var forward = false;
		var count = getCount();
		Logger.log(count);
		if (firstRow < 2) {
			firstRow = 2;
			backward = false;

		}
		if (pageNumber <= 1) {
			firstRow = lastRow - 100 + 1;
			forward = false;
		}
		if (pageNumber > 1) {

			forward = true;
		}

		var data = ss.getRange(firstRow, 1, 100, ss.getLastColumn()).getValues();
		var data = data.filter(function (element) {
			return element.join("") != ""
		});

		for (var row = 0; row < 100; row++) {

			data[row][13] = firstRow + row;

			data[row][0] = Utilities.formatDate(data[row][0], Session.getScriptTimeZone(), "M/d/yyyy");

			data[row][11] = data[row][10] == Session.getActiveUser().getEmail() && getCount() < 6;// set permission, get TRUE if current record created by current user and total records no more than 6


		}
		return {
			data: data,
			bigpages: bigPages,
			backward: backward,
			forward: forward,
			count: getCount()
		};

	} else {

		var data = ss.getRange(1, 1, lastRow, ss.getLastColumn()).getValues();
		data.splice(0, 1); //remove header of table
		for (var row = 0; row < data.length; row++) {

			data[row][13] = 2 + row;

			data[row][0] = Utilities.formatDate(data[row][0], Session.getScriptTimeZone(), "M/d/yyyy");

			data[row][11] = data[row][10] == Session.getActiveUser().getEmail() && getCount() < 6; // set current user permission


		}
		return {
			data: data,
			bigpages: 1,
			backward: false,
			forward: false,
			count: getCount()
		};


	}
}

function getCount() {
	var ssFirst = SpreadsheetApp.openById(spreadsheetId); //Spreadsheet name;CRUD
	var limitSheet = ssFirst.getSheetByName('Count');
	var data = limitSheet.getDataRange().getValues();
	var data = data.filter(function (element) {
		return element.join("") != ""
	});
	var email = Session.getActiveUser().getEmail();
	for (var i = 1; i < data.length; i++) {
		if (data[i][0] == email) {
			return data[i][1];

		}
		return 0;


	}
}

function getPermission() {
	if (getCount() < 5) {
		return true;
	} else {
		return false;
	}


}


function processForm(formObj) { // process form
	var id = parseInt(formObj.rowID);
	var date = formObj.Date;
	var dateString = Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), "M/d/yyyy");
	var dept = formObj.Dept;
	var job = formObj.Job;
	var part = formObj.Part.toUpperCase();

	var qty = formObj.Quantity;
	var status = formObj.Status;
	var check = formObj.Check;
	var note = formObj.Note;
	var emailDept = formObj.Email;

	if (typeof emailDept === 'undefined') {
		emailDept = '';
	} else {
		if (emailDept.length > 1) {
			emailDept = emailDept.toString();

		} //emailDept.length==1, do nothing


	}
	var folderLink = createSubfolder(job);
	var user = Session.getActiveUser().getEmail();
	var permisson = false;


	var newLog = SpreadsheetApp.openById(spreadsheetId); //Spreadsheet name;CRUD

	var logSheet = newLog.getSheetByName('Log');


	if (id < 0) { //new record

		logSheet.appendRow([dateString, dept, job, part, qty, status, check, note, folderLink, emailDept, user, permisson, 'false']);


	} else { //edit  mode


		logSheet.getRange(id, 1).setValue(dateString);
		logSheet.getRange(id, 2).setValue(dept);
		logSheet.getRange(id, 3).setValue(job);
		logSheet.getRange(id, 4).setValue(part);
		logSheet.getRange(id, 5).setValue(qty);
		logSheet.getRange(id, 6).setValue(status);
		logSheet.getRange(id, 7).setValue(check);
		logSheet.getRange(id, 8).setValue(note);

		logSheet.getRange(id, 9).setValue(folderLink);
		logSheet.getRange(id, 10).setValue(emailDept);
		logSheet.getRange(id, 11).setValue(user);


	}
	SpreadsheetApp.flush();

	if (emailDept != '') { //send Email

		var emailNameList = emailList(emailDept);

		var Subject = "Part Number: " + part + ' Quality Status: ' + status;
		var message = 'Hi ' + emailNameList + '<br /><br />' + 'Product Number: ' + part + '<br />Status: ' + status + '<br />' + 'Job#: ' +
			job + '<br />' + 'Quantity: ' + qty + '<br />Note: ' + note + '  <br /><br /> ';
		var options = {}
		options.htmlBody = message + "<br /><br />Here is photos: " + '<a href=' + folderLink + '>' + 'Take Look' + '</a>';
		
		options.name = Session.getActiveUser().getEmail();
		GmailApp.sendEmail(emailNameList, Subject, message, options);
	}

	return ({

		folderLink: folderLink,
		folderName: job,


	});


} // end of Form Process

function emailList(dept) {
	
	var list = [];
	var emailsInDept = [];
	var i;
	var j = 0;
	var ss = SpreadsheetApp.openById(spreadsheetId); //Spreadsheet name;CRUD
	
	var emailSheet = ss.getSheetByName('Emails')
	var emailData = emailSheet.getDataRange().getValues();
	for (i = 0; i < emailSheet.getLastColumn(); i++) {
		if (dept.indexOf(emailData[0][i]) >= 0) { //dept chosen

			emailsInDept = getEmails(emailData, i);
		}
		list = list.concat(emailsInDept);
	}

	return (list);
}

function getEmails(data, colum) {
	var emailList = [];
	var j = 0;
	for (i = 1; i < data.length; i++) {
		if (data[i][colum] != '') {
			emailList[j] = data[i][colum];
			j++;
		}
	}
	return emailList;
}

function deleteItem(id) {
	var newLog = SpreadsheetApp.openById(spreadsheetId); //Spreadsheet name;CRUD
	var logSheet = newLog.getSheetByName('Log');
	logSheet.getRange(id, 13).setValue(true);
	SpreadsheetApp.flush();
}

function createSubfolder(subfolderName) {//create subfolder if it is not exist, return link of the folder

	var parentFolderId = "dddddddddddd"; //folder id under which subfoolders created by job number
	var parentFolder = DriveApp.getFolderById(parentFolderId);
	var folder;
	try {
		folder = parentFolder.getFoldersByName(subfolderName).next();
	} catch (e) {
		folder = parentFolder.createFolder(subfolderName);
	}

	var link = "https://drive.google.com/drive/folders/" + folder.getId();


	return (link);
}

function deleteAll(){//delete all records in "Log" and subfolders everyday by trigger 
    var ss = SpreadsheetApp.openById(spreadsheetId); //Spreadsheet name;CRUD	
    var logSheet = ss.getSheetByName('Log');
    var column=logSheet.getLastColumn();
    var header= logSheet.getRange(1,1,1,column).getValues();// save header of Log
    logSheet.clear();// clear Log sheet
    logSheet.getRange(1,1,1,column).setValues(header);// set header
    var parentFolderId = "dddddddddd"; //folder id under which subfoolders created by job number
    var parentFolder = DriveApp.getFolderById(parentFolderId);
    var folders=parentFolder.getFolders();
    while (folders.hasNext()) {
      folders.next().setTrashed(true);
    }
  
    
    

}

