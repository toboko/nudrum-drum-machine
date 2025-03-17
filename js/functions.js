const randomCharacter = function() {
	let possible = "abcdefghijklmnopqrstuvwxyz0123456789";
	return possible[Math.floor(Math.random() * possible.length)];
};

const randomBool = function() {
	let possible = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0];
	return possible[Math.floor(Math.random() * possible.length)] === 1;
};

const short = function(min= 5 ) {
	let out = [], str;

	for (let i = 0; i < min; i++) {
		str = randomCharacter();
		str = randomBool() ? str.toUpperCase() : str;
		out.push(str);
	}
	return out.join("");
};

const normal = function (i, l, a = true) {
	i = i % l;
	return (i === 0 && a) ? l : i;
};

const rshft = function(arr, places) {
	for (let i = 0; i < places; i++) {
		arr.unshift(arr.pop());
	}
};

const lshft = function(arr, places) {
	for (let i = 0; i < places; i++) {
		arr.push(arr.shift());
	}
};

const findGetParameter = function(parameterName) {
	let result = null,
		tmp = [];
	let items = window.location.search.substr(1).split("&");
	for (let index = 0; index < items.length; index++) {
		tmp = items[index].split("=");
		if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
	}
	return result;
};

Date.dateDiff = function(datepart, diff) {
	datepart = datepart.toLowerCase();
	let divideBy = {
		w: 604800000,
		d: 86400000,
		h: 3600000,
		m: 60000,
		s: 1000
	};

	return Math.floor(diff / divideBy[datepart]);
};