// Function to normalize a value
function normal(value, max, one = true) {
	let res = value % max;
	return one ? (res === 0 ? max : res) : res;
}

// Left shift function for arrays
function lshft(arr, places) {
	while (places--) {
		arr.push(arr.shift());
	}
	return arr;
}

// Right shift function for arrays
function rshft(arr, places) {
	while (places--) {
		arr.unshift(arr.pop());
	}
	return arr;
}

// Short ID generator
function short(len = 5) {
	return Math.random().toString(36).substr(2, len);
}

// Get URL parameter by name
function findGetParameter(parameterName) {
	let result = null,
		tmp = [];
	location.search
	.substr(1)
	.split("&")
	.forEach(function (item) {
		tmp = item.split("=");
		if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
	});
	return result;
}

// Date difference calculations
Date.dateDiff = function(interval, diff) {
	let second = 1000,
		minute = second * 60,
		hour = minute * 60,
		day = hour * 24,
		week = day * 7;

	diff = Math.abs(diff);

	switch (interval) {
		case 's': return Math.floor(diff / second);
		case 'm': return Math.floor(diff / minute);
		case 'h': return Math.floor(diff / hour);
		case 'd': return Math.floor(diff / day);
		case 'w': return Math.floor(diff / week);
		default: return diff;
	}
};

