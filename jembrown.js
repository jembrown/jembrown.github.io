// General utility javascript library created by Jeremy M. Brown

function drawPermutHist(xCoor,yCoor,h,w,svg,vals){	
	// First element of vals is observed diff
	
	// "..." is the spread operator - converts array into its component values
	var spread = Math.max(...vals) - Math.min(...vals);

	if (vals.length > 1){
		var xMin = Math.min(...vals) - (spread * 0.1);
		var xMax = Math.max(...vals) + (spread * 0.1);
	} else {
		var xMin = vals[0]-1.0;
		var xMax = vals[0]+1.0;
	}
	
	// Draw x-axis
	svg.append("line")
		.attr("x1",xCoor-(w/2))
		.attr("x2",xCoor+(w/2))
		.attr("y1",yCoor)
		.attr("y2",yCoor)
		.attr("stroke","black")
		.attr("stroke-width",2);

	var xScaleFactor = w/(xMax-xMin);

	// Add x-axis ticks and values
	if (vals.length > 1){
		svg.append("text")
		   .attr("y",yCoor+15)
		   .attr("x",(xCoor-(w/2))+((xMin-xMin)*xScaleFactor)-10)
		   .attr("font-family","sans-serif")
		   .attr("font-size","14px")
		   .attr("fill","black")
		   .text(Math.round(xMin*100)/100)
		svg.append("text")
		   .attr("y",yCoor+15)
		   .attr("x",(xCoor-(w/2))+((xMax-xMin)*xScaleFactor)-10)
		   .attr("font-family","sans-serif")
		   .attr("font-size","14px")
		   .attr("fill","black")
		   .text(Math.round(xMax*100)/100)
		svg.append("text")
		   .attr("y",yCoor+15)
		   .attr("x",(xCoor-(w/2))+((xMax-xMin)*0.5*xScaleFactor)-10)
		   .attr("font-family","sans-serif")
		   .attr("font-size","14px")
		   .attr("fill","black")
		   .text(Math.round(((xMin+xMax)/2.0)*100)/100)
	} else {
		svg.append("text")
		   .attr("y",yCoor+15)
		   .attr("x",(xCoor-(w/2))+((vals[0]-xMin)*xScaleFactor)-10)
		   .attr("font-family","sans-serif")
		   .attr("font-size","14px")
		   .attr("fill","black")
		   .text(Math.round(vals[0]*10)/10)
	}

	// Label x-axis
	svg.append("text")
	   .attr("x",xCoor-50)
	   .attr("y",yCoor+40)		 	
	   .attr("font-family","sans-serif")
	   .attr("font-size","16px")
	   .attr("fill","black")
	   .text("Difference in Means")

	// Draw y-axis
	svg.append("line")	
		.attr("x1",xCoor-(w/2))
		.attr("x2",xCoor-(w/2))
		.attr("y1",yCoor)
		.attr("y2",10)
		.attr("stroke","black")
		.attr("stroke-width",2);
		
	// Label y-axis
	svg.append("text")
	   .attr("x",xCoor-(w/2)-10)
	   .attr("y",yCoor-25)		 	
	   .attr("font-family","sans-serif")
	   .attr("font-size","16px")
	   .attr("fill","black")
	   .attr("transform","rotate(-90,"+(xCoor-(w/2)-10)+","+(yCoor-25)+")")
	   .text("Frequency")

	// Show observed diff
	svg.append("line")
	   .attr("x1",(xCoor-(w/2))+((vals[0]-xMin)*xScaleFactor))
	   .attr("x2",(xCoor-(w/2))+((vals[0]-xMin)*xScaleFactor))
	   .attr("y1",yCoor)
	   .attr("y2",10)
	   .attr("stroke","red")
	   .attr("stroke-width",6)

}

function permuteLabels(perLabels,origLabels){
	var newLabels = [];
	while (origLabels.length > 0){
		var index = Math.floor(Math.random()*origLabels.length);
		newLabels.push(origLabels.splice(index,1)[0]);
	}
	perLabels.push(newLabels);
}

function calcPerDiffs(vals,diffArray,newLabels){
	var mVals = [];
	var fVals = [];

	for (let i = 0; i < newLabels.length; i++){
		if (newLabels[i] == "M"){
			mVals.push(vals[i]);
		} else {
			fVals.push(vals[i]);
		}
	}

	var newDiff = avg(fVals) - avg(mVals);

	diffArray.push(newDiff);
}

function copy(o) {
   var output, v, key;
   output = Array.isArray(o) ? [] : {};
   for (key in o) {
       v = o[key];
       output[key] = (typeof v === "object") ? copy(v) : v;
   }
   return output;
}

function avg(arr){
	let mySum = 0.0;
	for (let i = 0; i < arr.length; i++){
		mySum += arr[i];
	}
	return mySum/arr.length;
}