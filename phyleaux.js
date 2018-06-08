// phyleaux.js (a1)
// Jeremy M. Brown
// jembrown@lsu.edu
// A library for phylogenetic illustrations and animations
// *** Requires d3.js ***


// ---------------- ** Classes ** ----------------

// Class for nodes in a phylogenetic tree

class Node {

	constructor( nodeStr, hasBrl, parent, name ){
	
		// Terminal Node
		if (!nodeStr.includes(")")){
			if (!hasBrl){
				this.name = nodeStr;
				this.desc = null;
				this.parent = parent;
				this.depth = parent.depth + 1;	// Depth = # of nodes from root		
			} else {
				var parsedNodeStr = nodeStr.split(":");
				this.name = parsedNodeStr[0];
				this.brl = parseFloat(parsedNodeStr[1]);
				this.desc = null;
				this.parent = parent;
				this.depth = parent.depth + 1;
				this.rootDist = parent.rootDist + this.brl;				
			}
		}
		
		// Internal Node
		else {
			this.name = name;		// Name the node, if provided
			this.parent = parent;
			this.desc = [];			// Initialize array to hold descendant nodes
			
			// Record branch length and remove from node string
			if (hasBrl && name != "root"){
				var lastColon = nodeStr.lastIndexOf(":");
				this.brl = parseFloat(nodeStr.slice(lastColon+1));
				nodeStr = nodeStr.slice(0,lastColon);
			} else if (hasBrl && name === "root"){		// No branch length for the root
				this.brl = null;
			}
			
			if (name === "root"){	// Initiate depth values at root
				this.depth = 0;
				this.rootDist = 0;
			} else {
				this.depth = parent.depth + 1;
				this.rootDist = parent.rootDist + this.brl;
			}
			
			// Remove starting and trailing parentheses
			nodeStr = nodeStr.slice(1,nodeStr.length-1);
			
			// Find positions of commas that separate descendants (2 or more)
			var commaIndices = findSplitCommas(nodeStr);
			
			// Create descendant nodes
			var descStrings = []; // Initialize array -> 1 string per descendant
			for (var i = 0; i <= commaIndices.length; i++){
				if (i === 0){	// First descendant (need to start at index 0)
					descStrings.push(nodeStr.slice(0,commaIndices[i]));
				} else {		// All other descendants
					descStrings.push(nodeStr.slice(commaIndices[i-1]+1,commaIndices[i]));
				}
			}
			
			// Recursively call Node constructor for each descendant string
			for (var j = 0; j < descStrings.length; j++){
				// No names for internal nodes right now
				this.desc.push(new Node(descStrings[j], hasBrl, this, null));
			}	
		}	// ends else
	}	// ends constructor
}

// Class for an entire phylogenetic tree

class Tree {

	constructor( treeStr ){	// Uses Newick string to instantiate a Tree object
	
		// Determining if tree has branch lengths and setting flag
		this.hasBrl = false;
		if (treeStr.includes(":")){ this.hasBrl = true; }

		// Flags used to indicate which x and y coordinates have been set
		this.isCladogram = false;
		this.isPhylogram = false;

		// Remove trailing semi-colon, if present
		if (treeStr.endsWith(';')){
			treeStr = treeStr.slice(0,treeStr.length-1);
		}
		
		// Create tree by passing treeStr to recursive Node constructor
		this.root = new Node(treeStr,this.hasBrl,null,"root");
		this.root.tree = this;
		
		// Recurses back through tree to calculate number of tips
		//	- Should move this to be part of Tree construction
		this.tipNum = calcTipNum(this.root);
		
		// Recurses back through tree to add numeric labels to nodes
		//	- Should make this part of Tree construction
		labelNodes(this.root,[1,this.tipNum+1]);
	}
}

class AnimatedLineOverTree{
	// This defines a class for animating a vertical line along a horizontally drawn tree.
	// Defining this as a class, rather than a function, in order to be able to have object
	// values set interactively by the user.

	constructor( tr, w, h, scale=0.9, padding=30, lwd=2, color="orange", moveTime=10000, tipLabels=false ){
		this.tr = tr;
		this.w = w;
		this.h = h;
		this.scale = scale;
		this.padding = padding;
		this.lwd = lwd;
		this.color = color;
		this.moveTime = moveTime;	
		
		drawPhylogram(this.tr,this.w,this.h,"blue",lwd,scale,padding,tipLabels);
		
		if (tr.isCladogram === false && tr.isPhylogram === false){
			alert("Tree does not appear to have been drawn.")
		}
	
		// Selects existing svg
		this.svg = d3.select("body").select("svg");

		// Set up "dataset" with x coordinates for all existing lines
		//	- Probably a way to do this in d3 without this? Avoid selecting all lines?
		this.lineX = [];
		this.currentLines = document.querySelectorAll("line");
		for (var i = 0; i < this.currentLines.length; i++){
			this.lineX.push( [ this.currentLines[i].getAttribute("x1"), this.currentLines[i].getAttribute("x2") ] );
		}

		// Add new line to animate
		this.lineX.push([this.tr.root.x + this.padding, this.tr.root.x + this.padding]);

		this.yMin = this.padding - (this.padding/2);
		this.yMax = (h * this.scale) + (3 * this.padding / 2);		

		var lineXlen = this.lineX.length;

		// Bind x coordinate data to all lines, and draw new line
		this.svg.selectAll("line")
			   .data(this.lineX)			// Binds x position to the line
			   .enter()
			   .append("line")		// Appends initial circle to svg - attributes below
			   .attr("x1",function(d){
				 return d[0];			// x position is the bound datum
			   })
			   .attr("x2",function(d){
				 return d[1];
			   })
			   .attr("id",function(d,i){
					if (i === lineXlen - 1){
						return "progressLine";
					}
			   })
			   .attr("y1",this.yMin)
			   .attr("y2",this.yMax)
			   .attr("stroke",this.color)
			   .attr("stroke-width",this.lwd);

		// Find final x-position for line
		this.finalX = this.scale * this.w + this.padding;
	}
}

class AnimatedLTT{
// Draws an animated lineage-through-time (LTT) plot for a corresponding tree
// Most effective when paired with a visualization along the tree

	constructor(tr,w,h,scale=0.9,padding=30,lwd=4,color="orange",plotTime=10000){
		this.tr = tr;
		this.w = w;
		this.h = h;
		this.scale = scale;
		this.padding = padding;
		this.lwd = lwd;
		this.color = color;
		this.plotTime = plotTime;
		
		this.svg = d3.select("body")		// Adds new svg to body
			.append("svg")
			.attr("width",this.w)
			.attr("height",this.h)
			.attr("id","LTTsvg");

		// Finds the x coordinates of every node in the tree
		this.nodeXvals = extractNodeXVals(this.tr.root,[]);
	
		// Removes duplicate x coordinates - most common for tips in an ultrametric tree
		// https://stackoverflow.com/questions/9229645/remove-duplicate-values-from-js-array
		
		// Have to use this dummy variable, cleanedXvals, because "this." doesn't work
		// inside of filter function.
		var cleanedXvals = this.nodeXvals;
		cleanedXvals = cleanedXvals.filter(function(item, pos) {
			return cleanedXvals.indexOf(item) == pos;
		})
		this.nodeXvals = cleanedXvals;
	
		// Sorts the x coordinates from left to right
		this.nodeXvals = this.nodeXvals.sort(function compare(a,b) { return a - b });
	
		// Counts the number of lineages present immediately to the right of a 
		// given x coordinate (i.e., the number of lineages that begin at the node(s) with
		// that coordinate).
		this.lineageCounts = [];
		for (var z = 0; z < this.nodeXvals.length; z++){
			this.lineageCounts.push(countLineages(this.tr.root,this.nodeXvals[z],0));
		}
	
		// Adjusts the lineage count for the final tip node, since there are 0 lineages to
		// its right. Makes it the same as the node with the next largest x coordinate.
		this.lineageCounts[this.lineageCounts.length - 1] = this.lineageCounts[this.lineageCounts.length - 2];
	
		// Sets up y scale function and axis. Maximum y value is the largest lineage count.
		this.yScale = d3.scaleLog()
					   .base(Math.E)
					   .domain([1,Math.max(...this.lineageCounts)]) 		 // ... syntax expands array
					   .range([(this.h * this.scale), this.padding]);		 // into individual elements.
		this.yAxis = d3.axisLeft()
					  .scale(this.yScale)
					  .ticks(5)
					  .tickFormat(d3.format(".2"));
				   
		// Sets up x scale function and axis. Ranges from 0 (root) to 1 (final tip node).
		this.xScale = d3.scaleLinear()
					   .domain([0,1])
					   .range([this.padding, (this.w * this.scale) + this.padding]);
		this.xAxis = d3.axisBottom()
					   .scale(this.xScale)
					   .ticks(5);
				  
		// Adds the x-axis to the svg and translates it to the bottom of the plot
		this.svg.append("g")
		   		.attr("class","axis")
		   		.attr("transform","translate(0," + (this.h * this.scale) + ")")
		   		.call(this.xAxis);

		// Adds the x-axis label
		this.svg.append("text")
				.attr("transform","translate(" + w/2 + "," + ((this.h * this.scale)+40) + ")")
				.style("text-anchor","middle")
				.text("Relative Tree Depth")

		// Adds the y-axis to the svg and translates it to the right with padding
		this.svg.append("g")
		   		.attr("class","axis")
		   		.attr("transform","translate(" + this.padding + ",0)")
		   		.call(this.yAxis);
	
		// Adds the y-axis label
		this.svg.append("text")
				.attr("transform","rotate(-90)")
				.attr("x",0-this.h/2)
				.attr("y",15)
				.style("text-anchor","middle")
				.text("Number of Lineages (natural log scale)")
		// Apparently, x- and y-axes rotate along with text.
	
		// Adds a circle to the y-axis with the initial number of lineages (i.e., those that
		// descend from the root).
		this.svg.append("circle")
		   		.attr("cx",this.xScale(0))
		   		.attr("cy",this.yScale(this.lineageCounts[0]))
		   		.attr("r",3)
		   		.attr("fill",this.color)
	}
}


// ---------------- ** Functions ** ----------------

// Function to begin animation of circles down a tree that's been drawn
// Animation begins after click anywhere on svg containing tree.
// Uses recursive calls to moveCirclesCladogram() to accomplish animation
// Scale and padding need to be the same as those used for drawing the tree

function animateCircleDownCladogram(tr,w,h,scale=0.9,padding=30,radius=3,color="black"){
	
	// Selects existing svg
	var svg = d3.select("body").select("svg");

	// Instantiates nodeset to keep track of nodes with associated shapes down tree
	var nodeset = [tr.root];

	// Sets up first circle at root
	svg.selectAll("circle")
	  .data(nodeset,key)	// Binds nodes to circles - initially just the root
	  .enter()
	  .append("circle")		// Appends initial circle to svg - attributes below
	  .attr("cx",function(d){
	  	return (d.x * scale * w) + padding;	// d.x and d.y are [0-1]
	  })
	  .attr("cy",function(d){
	  	return (d.y * scale * h) + padding;
	  })
	  .attr("r",radius)
	  .attr("fill",color);
	  
	// This variable will be used to keep track of x-position for circles as they 
	// move down the tree.
	var currX = 0;
	  
	svg.on("click",function(){	// Start animation when click detected anywhere on svg
	   		moveCirclesCladogram(nodeset,svg,currX,tr.tipNum,1500);
	   });
}

// --------------------------------------------------

// Function to calculate the number of tips in a tree

function calcTipNum(node){
	var tipCount = 0;
	if (node.desc === null){	// Found tip
		tipCount = 1;
	} else {
		for (var i = 0; i < node.desc.length; i++){	// Internal
			tipCount += calcTipNum(node.desc[i]);
		}
	}
	return tipCount;
}

// --------------------------------------------------

// Function to count the number of lineages present immediately to the right of a given
// x coordinate.
// Arguments:
//	- node: Initially expects the root node, then recursively moves through tree
//  - xVal: The x coordinate for which lineages are being counted
//  - count: Counter variable to keep track of number of lineages

function countLineages(node,xVal,count){
	if (node.parent === null && node.x === xVal) {			// Root
		return node.desc.length;
	} else if (node.parent != null && node.x > xVal && node.parent.x <= xVal){
		count++;
	}
	if (node.desc != null){
		for (var i = 0; i < node.desc.length; i++){
			count = countLineages(node.desc[i],xVal,count);
		}
	}
	return count;
}

// --------------------------------------------------

// Function to plot a cladogram, if appropriate x and y values available
// w and h are the width and height of the new svg
// lwd is line width
// tipLabels is bool to specify whether or not tips should be labeled

// Make member function of tree?
function drawCladogram(tr,w,h,color="black",lwd=4,tipLabels=false){

	var svg = d3.select("body")		// Adds svg to body
	  			.append("svg")
	  			.attr("width",w)
	  			.attr("height",h);
	  			
	// Traverses tree and sets node x and y values on [0-1] scale for plotting
	setCladogramXY(tr.root,0,tr.tipNum,findMaxNodeDepth(tr.root));  			
	
	// Recursive function to actually draw lines
	drawNodeLines(tr.root,svg,w,h,color,lwd);
	
	// Adds tip labels, if requested
	if (tipLabels){
		drawTipLabels(tr);
	}	
}


// --------------------------------------------------

// Function used to draw individual lines on an LTT plot.
// Could be used more generally than just LTTs, though.

function drawLTTLines(x1,x2,y1,y2,svg,xScale,yScale,color="black",lwd=3){
	svg.append("line")
	   .attr("x1",xScale(x1))
	   .attr("x2",xScale(x2))
	   .attr("y1",yScale(y1))
	   .attr("y2",yScale(y2))
	   .attr("stroke",color)
	   .attr("stroke-width",lwd)
	   .attr("stroke-linecap","round")
}

// --------------------------------------------------

// Function to draw square tree on existing svg
// Scale values < 1 keeps total tree size smaller than the svg.
// Padding shifts lines away from svg edges in top-left corner
// w and h are the width and height of the svg, respectively
// lwd is the line width

function drawNodeLines(node,svg,w,h,color,lwd,scale=0.9,padding=30){

	if (node.desc != null){	// Operates on internal nodes - lines drawn parent -> desc
		for (var i = 0; i < node.desc.length; i++){
			svg.append("line")	// Vertical lines
			   .attr("x1",(node.x * w * scale) + padding)
			   .attr("x2",(node.x * w * scale) + padding)
			   .attr("y1",(node.y * h * scale) + padding)
			   .attr("y2",(node.desc[i].y * h * scale) + padding)
			   .attr("stroke",color)
			   .attr("stroke-width",lwd);
			   
			if (Math.abs(node.x - node.desc[i].x) > 0.001){
				svg.append("line")	// Horizontal lines
				   .attr("x1",(node.x * w * scale) + (padding-(lwd/2)))
				   // Subtracting by lwd/2 for x1 is what keeps line intersections square
				   .attr("x2",(node.desc[i].x * w * scale) + padding)
				   .attr("y1",(node.desc[i].y * h * scale) + padding)
				   .attr("y2",(node.desc[i].y * h * scale) + padding)
				   .attr("stroke",color)
				   .attr("stroke-width",lwd);
				   
			} else {	// Corrects for plotting artifacts with brls < lwd
				svg.append("line")	// Horizontal lines
				   .attr("x1",(node.x * w * scale) + (padding-(lwd/2)))
				   // Subtracting by lwd/2 for x1 is what keeps line intersections square
				   .attr("x2",(node.x * w * scale) + padding + (lwd/2))
				   .attr("y1",(node.desc[i].y * h * scale) + padding)
				   .attr("y2",(node.desc[i].y * h * scale) + padding)
				   .attr("stroke",color)
				   .attr("stroke-width",lwd);
			}
			
			drawNodeLines(node.desc[i],svg,w,h,color,lwd,scale,padding);
		}	
	}
}

// --------------------------------------------------

// Function to plot a phylogram, if appropriate x and y values available
// w and h are the width and height of the new svg
// lwd is line width
// tipLabels is bool to specify whether or not tips should be labeled

// Make member function of tree?
function drawPhylogram(tr,w,h,color="black",lwd=2,scale=0.9,padding=30,tipLabels=false){

	var svg = d3.select("body")		// Adds svg to body
	  			.append("svg")
	  			.attr("width",w)
	  			.attr("height",h)
	  			.attr("id","phylosvg");
	  			
	// Traverses tree and sets node x and y values on [0-1] scale for plotting
	setPhylogramXY(tr.root,0,tr.tipNum,findMaxRootDist(tr.root));  			
	
	// Root
	svg.append("line")
	   .attr("x1",0)
	   .attr("x2",padding)
	   .attr("y1",(tr.root.y * this.scale * this.h) + padding)
	   .attr("y2",(tr.root.y * this.scale * this.h) + padding)
	   .attr("stroke",color)
	   .attr("stroke-width",lwd);
	
	// Recursive function to actually draw lines
	drawNodeLines(tr.root,svg,w,h,color,lwd,scale,padding);
	
	// Adds tip labels, if requested
	if (tipLabels){
		drawTipLabels(tr.root,svg,w,h,scale,padding);
	}	
}

// --------------------------------------------------

// Make member function of tree?
function drawTipLabels(node,svg,w,h,scale,padding){
	if (node.desc != null){				// Internal node
		for (var i = 0; i < node.desc.length; i++){	// Recursively call descendant nodes
			drawTipLabels(node.desc[i],svg,w,h,scale,padding);
		}
	} else if (node.desc === null){		// Terminal node
		svg.append("text")
		   .attr("transform","translate(" + ((node.x * scale * w) + padding + 5) + "," + ((node.y * scale * h) + padding + 2) + ")")
		   .attr("text-anchor","left")
		   .attr("font-size",6)
		   .text(node.name)
	}
}

// --------------------------------------------------

// Function to create an array of node x coordinates from a tree

function extractNodeXVals(node,xVals){
	xVals.push(node.x);
	if (node.desc != null){
		for (var i = 0; i < node.desc.length; i++){
			xVals = extractNodeXVals(node.desc[i],xVals);
		}
	}
	return xVals;
}

// --------------------------------------------------

// Function to find the terminal node with the maximum depth
// Depth is defined as the number of intervening nodes to root
// Root depth = 0, root's descendant's depth = 1, etc.

function findMaxNodeDepth(node){
	var maxDepth = node.depth;	// Records depth of node
	if (node.desc != null){
		for (var i = 0; i < node.desc.length; i++){
			var descMax = findMaxNodeDepth(node.desc[i]); // Recursive call to find max
			if (descMax > maxDepth){					  // depth of descendants.
				maxDepth = descMax;	// Overwrites node depth if descendant depth greater
			}
		}
	}
	return maxDepth;
}

// --------------------------------------------------

// Function to find the terminal node with the maximum distance from the root
// Root distance is the combined length of all branches from root to tip

function findMaxRootDist(node){
	var maxDist = node.rootDist;	// Records depth of node
	if (node.desc != null){
		for (var i = 0; i < node.desc.length; i++){
			var descMax = findMaxRootDist(node.desc[i]); // Recursive call to find max
			if (descMax > maxDist){					  // depth of descendants.
				maxDist = descMax;	// Overwrites node depth if descendant depth greater
			}
		}
	}
	return maxDist;
}

// --------------------------------------------------

// Function to find minimum x value for a set of Node objects
// Used when animating objects down a tree

function findMinX(d) {		
	var min = d[0].x;		
	for (var i in d){
		if (d[i].x < min){
			min = d[i].x;
		}
	}
	return min;
}

// --------------------------------------------------

// Function to find positions of commas to split string for internal nodes

function findSplitCommas(nodeStr){	

	var commaIndices = [];

	// Parentheses counters
	var parCount = 0;
	
	for (var i = 0; i <= nodeStr.length; i++){
		
		// Keeping track of parentheses
		if (nodeStr[i] == "(") { parCount++; }
		else if (nodeStr[i] == ")") { parCount--; }
		
		// Splitting at the appropriate comma
		if (parCount === 0 && nodeStr[i] === ','){
			commaIndices.push(i);
		}
	}
	
	return commaIndices;
}

// --------------------------------------------------

// Function for d3 to bind DOM objects to nodes by ID

var key = function(node){
	return node.id;
}

// --------------------------------------------------

// Function to add numeric labels to Nodes in a Tree
// 0 -> root, 1 to N -> tips
// N+1 to 2N-2 -> internals (unrooted)
// N+1 to 2N-1 -> internals (rooted)
// node argument used for recursion
// IDs argument is vector of counters - [tipCounter,internalCounter]

function labelNodes(node,IDs){	
	
	// Terminals
	if (node.desc === null){	
		node.id = IDs[0];		
		IDs[0]++;				
	} 
	// Internals
	else {
		if (node.name === "root"){
			node.id = 0;
		} else {
			node.id = IDs[1];
			IDs[1]++;
		}
		for (var i = 0; i < node.desc.length; i++){	// Recurse through descendants
			IDs = labelNodes(node.desc[i],IDs)
		}
	}
	return IDs;
}

// --------------------------------------------------
// Function to animate line over tree
// Argument list:
//		lineX - Array of x-coordinate arrays [x1,x2] for all lines
//		finalX - Right-most position for line to move

function moveLine(lineX,svg,finalX,moveTime){
	
	var lines = svg.selectAll("line")
	
	lineX[lineX.length - 1][0] = finalX;
	lineX[lineX.length - 1][1] = finalX;
	
	lines.data(lineX)
		 .transition()
		 .ease(d3.easeLinear)
		 .duration(moveTime)
		 .attr("x1",function(d){
	  	 	return d[0];			// Data are arrays of x coordinates
	     })
	     .attr("x2",function(d){
	  	 	return d[1];
	     })
}

// --------------------------------------------------

// Recursive function to move circles down a tree
// Should work for either binary or multifurcating trees
// Argument list:
//	  nodeset  - the nodes that currently have circles bound to them
//    svg      - svg on which tree and circles are drawn
//    currX    - keeps track of x position for all circles down the tree
//    tipNum   - total number of tips in tree
//             - used to figure out when recursion is done
//    moveTime - time for each set of moves
//             - determines speed of move and delay on next moves

function moveCirclesCladogram(nodeset, svg, currX, tipNum, moveTime){
	
	// New array to hold nodes that will be added to nodeset (descendants of some 
	// current nodes).
	var newNodes = [];
	
	// New array to hold nodeset indices for nodes to be removed from nodeset (those
	// that are ancestors to nodes added to newNodes).
	var toSplice = [];
	
	// This loop iterates through nodes currently in nodeset. When it finds an internal 
	// node, it adds the node's descendants to newNodes and records the node's index in
	// toSplice. 
	for (var i = 0; i < nodeset.length; i++){
		if (nodeset[i].desc != null){	// Internal nodes
			toSplice.push(i);
			for (var j = 0; j < nodeset[i].desc.length; j++){
				newNodes.push(nodeset[i].desc[j]);
			}
		}
	}
	
	// Loops through indices in toSplice and removes nodes from nodeset.
	// Starts with larger indices (at end of nodeset), so as not to alter smaller indices.
	for (var k = toSplice.length-1; k >= 0; k--){
		nodeset.splice(toSplice[k],1);
	}
	
	// Combines updated nodeset with new nodes
	nodeset = nodeset.concat(newNodes);
	
	// Finds next x position based on minimum of x positions of new nodes
	// Actually, for cladogram these should all be the same...
	var minX = findMinX(newNodes);
	
	// Sets d3 selection set by binding updated nodeset (uses node id as key - see key())
	var circles = svg.selectAll("circle").data(nodeset,key);
	
	// Gets rid of svg circles for nodes removed from nodeset
	circles.exit().remove();
	
	// Start by creating new circles and plotting them on ancestor's location
	circles.enter()
		   .append("circle")
		     .attr("cx",function(d){
				  return (currX * scale * w) + padding;
		     })
		     .attr("cy",function(d){
				  return (d.parent.y * scale * h) + padding;
		     })
		     .attr("r",radius)
		     .attr("fill",color)
		     
		   // Merge new circles with existing circles
		   .merge(circles)
		   
		   // Move circles vertically (existing nodes won't move, though)
		   .transition()
		     .duration(moveTime/4)	// Set proportion of time for vertical move
		     .attr("cx",function(d){
			  	  return (currX * scale * w) + padding;
		     })
		     .attr("cy",function(d){
				  return (d.y * scale * h) + padding;
		     })
		     .attr("r",radius)
		     .attr("fill",color)
		     
		   // Move circles horizontally
		   .transition()
		     .duration(3/4 * moveTime)  // Set proportion of time for horizontal move
		     .attr("cx",function(d){
				  return (minX * scale * w) + padding;
		     })
		     .attr("cy",function(d){
				  return (d.y * scale * h) + padding;
		     })
		     .attr("r",radius)
		     .attr("fill",color)

	// Recursively call moveCirclesCladogram until nodeset is at the tips
	if (nodeset.length < tipNum){	// Compares length of nodeset to number of tips
		currX = findMinX(nodeset);	// Updates the current x position 
		window.setTimeout(moveCirclesCladogram, // Name of function to call
						  moveTime,	   			// Delay time
						  nodeset, svg, currX, tipNum, moveTime); // Function arguments
	}	
}

// --------------------------------------------------

// Utility function to print out the x coordinates for all the terminal nodes.
// It expects to initially be passed the root node of a tree (or a clade).

function printTermXVals(node){
	if (node.desc != null){
		for (var i = 0; i < node.desc.length; i++){
			printTermXVals(node.desc[i]);
		}
	} else {
		console.log(node.x);
	}
}

// --------------------------------------------------

// Function to extract Newick tree string from a file containing only such strings

function readNewick( file ){
	
	tree = "";
	
	// Code to open file and read tree(s)...
	
	return tree;
}

// --------------------------------------------------

// Function that traverses tree and sets relative X and Y coordinates (0-1) appropriately
// for plotting a cladogram.

function setCladogramXY(node,termCount,tipNum,maxDepth){

	if (node.name === "root"){	// Sets flags for tree
		node.tree.isCladogram = true;
		node.tree.isPhylogram = false;
	}

	if (node.desc != null){	// Internal node
		for (var i = 0; i < node.desc.length; i++){
			termCount = setCladogramXY(node.desc[i],termCount,tipNum,maxDepth);
		}
		node.x = node.depth/maxDepth;		// Uses pre-existing depth to set x coordinate
		var sumDescY = 0;
		for (var j = 0; j < node.desc.length; j++){
			sumDescY += node.desc[j].y;
		}
		node.y = sumDescY/node.desc.length;	// Averages y-positions of descendants to plot 
	}										// ancestor.
	
	if (node.desc === null){				// Terminal node
		node.x = 1;							// Tips all the way to the right
		node.y = termCount++/(tipNum-1);	// Evenly spreads tips vertically
	}										//	** Also updates termCount.
	
	return termCount;		// Keeps track of tip count to place them vertically
}

// --------------------------------------------------

// Function that traverses tree and sets relative X and Y coordinates (0-1) appropriately
// for plotting a phylogram.
// termCount keeps track of how many terminal nodes have been assigned coordinates

function setPhylogramXY(node,termCount,tipNum,maxDist){

	if (node.name === "root"){	// Sets flags for tree
		node.tree.isCladogram = false;
		node.tree.isPhylogram = true;
	}

	if (node.desc != null){	// Internal node
		for (var i = 0; i < node.desc.length; i++){
			termCount = setPhylogramXY(node.desc[i],termCount,tipNum,maxDist);
		}
		node.x = node.rootDist/maxDist;		// Uses pre-existing rootDist to set x coordinate
		var sumDescY = 0;
		for (var j = 0; j < node.desc.length; j++){
			sumDescY += node.desc[j].y;
		}
		node.y = sumDescY/node.desc.length;	// Averages y-positions of descendants to plot 
	}										// ancestor.
	
	if (node.desc === null){				// Terminal node
		node.x = node.rootDist/maxDist;		// x position is root distance
		node.y = termCount++/(tipNum-1);	// Evenly spreads tips vertically
	}										//	** Also updates termCount.
	
	if (node.x > 0.9999){	// Hacky solution to avoid rounding error for placing tips at 1
		node.x = 1;
	}
	
	return termCount;		// Keeps track of tip count to place them vertically
}

