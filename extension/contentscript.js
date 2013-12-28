var url = " t.co/vRBKRZOs6N";
var decodeUrl = " https://chrome.google.com";
var urlLen = 23;

function decode(encoded) {
	var data = "";
	if(!encoded)
		return null;

	//var urlIndex = encoded.indexOf(decodeUrl);
	//if(urlIndex >= 0) {
	//	encoded = encoded.substring(0, urlIndex);
	//}

	for(var i=0;i<encoded.length;i++) {
		var pieces = encodeURIComponent(encoded.charAt(i)).split("%");
		if(pieces.length == 1)
			return null;
		for(var j=1;j<pieces.length;j++) {
			var bits = parseInt(pieces[j], 16).toString(2);
			var index = bits.indexOf("10");
			data += bits.substring(index+2);
		}
	}
	
	chars = data.match(/.{1,8}/g);
	if(!chars)
		return null;
	output = "";
	for(i=0;i<chars.length;i++) {
		if(chars[i] != "11111111") {
			if(chars[i][0] != '0') {
				return null;
			}
			output += String.fromCharCode(parseInt(chars[i],2));
		}
	}

	return output;
}

var asciify = function(value) {
	//trailing spaces show up as &nbsp; maybe we should just strip all non-ascii characters?
	if(value > 127)
		value = 32;
	return value.toString(2);
}

var encode = function(raw){
	if(raw == "")
		return raw;
	bits = "";
	for(var i=0;i<Math.ceil(raw.length/2);i++) {
		value = raw.charCodeAt(i*2);
		code = asciify(value);

		while(code.length < 8)
			code = "0" + code;
		bits += code;

		if(i*2+1 >= raw.length)
			bits += "11111111";
		else {
			value = raw.charCodeAt(i*2+1);
			code = asciify(value);

			while(code.length < 8)
				code = "0" + code;
			bits += code;
		}
	}
	var chars = bits.match(/.{1,16}/g);
	for(i=0;i<chars.length;i++) {
		var parts = [];
		parts.push(parseInt("1110"+chars[i].substring(0,4), 2).toString(16));
		parts.push(parseInt("10"+chars[i].substring(4,10), 2).toString(16));
		parts.push(parseInt("10"+chars[i].substring(10,16), 2).toString(16));
		chars[i] = decodeURIComponent("%" + parts.join("%"));
	}

	var output = chars.join("");
	return output;
}

var splitParts = function(originalHtml) {
	var parts = originalHtml.split("<a");
	for(var i=0;i<parts.length;i++) {
		parts[i] = parts[i].split("</a>");
		if(parts[i].length > 1)
			parts[i] = parts[i][parts[i].length-1];
		else
			parts[i] = parts[i][0];
	}

	return parts;
}

var updatePage = function(){
	$('.js-tweet-text').each(function(){
		$(this).addClass('utf-decoded');
		//var plaintext = decode($(this).text());

		//what we need to do is check to see if this particular tweet was encoded by us.
		//the way we do that is, we decode it, and if we find a bunch of valid unicode chars in the data and can put together a tweet, we do it.

		var original = $(this);
		var originalHtml = original.html();
		var links = original.children('a');
		var parts = splitParts(originalHtml);

		var payload = "";
		for(var i=0;i<parts.length;i++) {
			if(i > 0 && parts[i].charAt(0) == ' ')
				parts[i] = parts[i].substring(1, parts[i].length);
			if(i < parts.length-1 && parts[i].charAt(parts[i].length-1) == ' ')
				parts[i] = parts[i].substring(0, parts[i].length-1);

			if(parts[i] != "") {
				parts[i] = decode(parts[i]);
				if(!parts[i])
					return;
				
				parts[i] = parts[i].replace(/&/g, "&amp;");
				parts[i] = parts[i].replace(/  /g, "&nbsp; ");
				parts[i] = parts[i].replace(/</g, "&lt;");
				parts[i] = parts[i].replace(/>/g, "&gt;");

				payload += parts[i]+" ";
			}

			if(i < parts.length-1) {
				if(i < parts.length-2 || $(links[i]).attr('href') != 'http://t.co/vRBKRZOs6N') {
					payload += links[i].outerHTML+" ";
				}
			}
		}

		if(payload.charAt(payload.length-1) == " ")
			payload = payload.substring(0, payload.length-1);

		if(payload)
			$(this).html(payload);
	});
}

var encodeFromObject = function(original) {
	var originalString = original.text();
	if(originalString == "")
		return "";
	var originalLength = originalString.length;
	var originalHtml = original.html();

	//remove the EM tags added by twitter when you go over the cap!
	originalHtml = originalHtml.replace(/<em>/g, "");
	originalHtml = originalHtml.replace(/<\/em>/g, "");

	var parts = splitParts(originalHtml);

	//now parts is the text in between the links
	var links = original.children('a');

	var payload = "";
	for(var i=0;i<parts.length;i++) {
		parts[i] = parts[i].replace(/&nbsp;/g, " ");
		parts[i] = parts[i].replace(/&lt;/g, "<");
		parts[i] = parts[i].replace(/&gt;/g, ">");
		parts[i] = parts[i].replace(/&amp;/g, "&");
		if(i > 0 && parts[i].charAt(0) == ' ')
			parts[i] = parts[i].substring(1, parts[i].length);
		if(i < parts.length-1 && parts[i].charAt(parts[i].length-1) == ' ')
			parts[i] = parts[i].substring(0, parts[i].length-1);

		if(parts[i] != "")
			parts[i] = encode(parts[i])+" ";

		payload += parts[i];
		if(i < parts.length-1)
			payload += $(links[i]).text()+" ";
	}
	if(payload.charAt(payload.length-1) == " ")
		payload = payload.substring(0, payload.length-1);

	return payload;
}

var unencodedLength = function(original){
	var originalLength = original.text().length;
	original.find('.twitter-timeline-link').each(function(){
		originalLength -= $(this).text().length;
		originalLength += 22;
	});

	return originalLength;
}

var mergeDivs = function(tweetbox) {
	var divs = tweetbox.find('div');
	if(divs.length > 1) {
		var totalHtml = "";
		divs.each(function(){
			var html = $(this).html();
			//html = html.replace(/<em>/g, "");
			//html = html.replace(/<\/em>/g, "");
			totalHtml += html;
		});
		tweetbox.find('div:not(:eq(0))').remove();
		tweetbox.find('div:eq(0)').html(totalHtml);
	}
}

var updateTextUI = function(tweetbox){

	var parent = tweetbox.parent().parent();
	var tweetCounter = parent.find('.tweet-counter');
	var original = tweetbox.find('div').first();
	var prospectiveMessage = encodeFromObject(original);
	var prospectiveLength = prospectiveMessage.length;

	original.find('.twitter-timeline-link').each(function(){
		prospectiveLength -= $(this).text().length;
		prospectiveLength += 22;
	});

	tweetCounter.text((140 - prospectiveLength)*2);

	//if we go beyond the real cap, disable it!
	if((140 - prospectiveLength)*2 < 0) {
		parent.find('.btn.primary-btn').addClass('disabled').attr('disabled', 'disabled');
	} else {
		parent.find('.btn.primary-btn').removeClass('disabled').removeAttr('disabled');
	}

	var originalLength = unencodedLength(original);
	var buttonLabel = parent.find('.button-text.tweeting-text');
	if(originalLength > 140) {
		//tweet longer
		buttonLabel.text("Tweet Longer");
	} else {
		buttonLabel.text("Tweet");
	}
}

//odd that i only have to call this once. maybe the code gets copied from something we modified, verbatim.
var enableButtons = function(){
	$('.tweet-form .btn.primary-btn.tweet-action').each(function(){
		//$(this).removeClass('tweet-action');
		//$(this).removeClass('disabled').removeAttr('disabled');
		var button = $(this).clone();
		button.removeClass('tweet-action');
		$(this).parent().append(button);
		$(this).addClass('realbutton').hide();
		//$(this).addClass('realbutton');
	});
	//each button that we see, we're gonna clone, then hide

	//replace the counter with our own
	$('.tweet-form .tweet-button span.tweet-counter').each(function(){
		$(this).replaceWith($("<div class='tweet-counter'>" + this.innerHTML + "</div>"))
	});
}

$(document).ready(function(){

	$('body').on('DOMNodeInserted DOMSubtreeModified DOMNodeRemoved', '.tweet-box.rich-editor', function(e) {
		//whenever the tweet box gets interacted with, update the count
		if(e.type == "DOMNodeInserted" && e.target.tagName == "DIV") {
			mergeDivs($(this));
		}
		updateTextUI($(this));
	});

	//$('body').on('click', 'a.js-action-reply', function(){
		//alert("CLICKED");
		//setTimeout(enableButtons, 150);
	//});

	//update the ui
	$('.tweet-box.rich-editor').each(function(){
		updateTextUI($(this));
	});

	enableButtons();

	$('body').on('click', '.tweet-form .btn.primary-btn:not(.realbutton)', function(e){

		var form = $(this).parent().parent().parent();

		//instead of selecting only the first div, let's go through all and concat their html into one big div
		
		var original = form.find('.tweet-box div').first();
		//now before we have the length, we need to replace all link lengths with 22.
		var originalString = original.text();
		var originalLength = unencodedLength(original);
		var originalHtml = original.html();
		
		if(originalLength > 140) {
			//var encoded = encode(originalString);

			//here, we split up the encoded parts, anywhere there's an <a whatever > we split it up
			var payload = encodeFromObject(original);

			if(payload) {
				//add the url to the end if there's room
				if(payload.length + urlLen <= 140)
					payload = payload + url;

				//$('#tweet-box-mini-home-profile div:not(:eq(0))').remove();
				original.text(payload);
			}
		}

		$(this).parent().find('.realbutton').click();
	});
	
	
	updatePage();
	setInterval(updatePage, 1000);
});