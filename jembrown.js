// General utility javascript library created by Jeremy M. Brown

function drawPermutHist(xCoor,yCoor,h,w,svg,vals){
	
	// "..." is the spread operator - converts array into its component values
	var spread = Math.max(...vals) - Math.min(...vals);

	if (vals.length > 1){
		var xMin = Math.min(...vals) - Math.round(spread * 0.1);
		var xMax = Math.max(...vals) + Math.round(spread * 0.1);
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

	// Label x-axis
	svg.append("text")
	   .attr("x",xCoor-50)
	   .attr("y",yCoor+20)		 	
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

}

function avg(arr){
	let mySum = 0.0;
	for (let i = 0; i < arr.length; i++){
		mySum += arr[i];
	}
	return mySum/arr.length;
}