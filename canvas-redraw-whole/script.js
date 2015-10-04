SpectrumAnalyzer = function () { this.init.apply(this, arguments) };
SpectrumAnalyzer.prototype = {
	init : function () {
		var self = this;

		self.fftSize = 8192;
		self.historySize = 512;

		self.initCanvas();
		self.openAudioStream();
	},

	openAudioStream : function () {
		var self = this;
		var times = [];
		analyzeAudioStream(self.fftSize, function (buffer) {
			var now = performance.now();
			self.renderLine(buffer);
			times.push(performance.now() - now);
			if (times.length > 60) {
				console.log('rendered:', times.reduce(function (r, i) { return r + i }) / times.length);
				times.length = 0;
			}
		});
	},

	initCanvas : function () {
		var self = this;
		self.container = document.createElement('div');
		self.container.style.width = "100%";
		self._current = 0;

		self.canvas = document.createElement('canvas');
		self.canvas.width  = self.fftSize / 2;
		self.canvas.height = self.historySize;
		self.canvas.style.width = "100%";
		self.canvas.style.height = self.historySize + "px";

		self.container.appendChild(self.canvas);

		document.body.appendChild(self.container);
	},

	renderLine : function (array) {
		var self = this;

		var ctx = self.canvas.getContext('2d');
		// shift data to up
		ctx.putImageData(
			ctx.getImageData(0, 1, self.canvas.width, self.canvas.height - 1),
			0, 0
		);

		var imageData = ctx.getImageData(0, self.canvas.height, self.canvas.width, 1);
		var data = imageData.data; // rgba

		for (var i = 0, len = self.canvas.width; i < len; i++) {
			var n = i * 4;
			var rgb = convertDecibelToRGB(array[i]);

			data[n + 0] = rgb.r;
			data[n + 1] = rgb.g;
			data[n + 2] = rgb.b;
			data[n + 3] = 255;
		}

		ctx.putImageData(imageData, 0, self.canvas.height-1);
	}
};


new SpectrumAnalyzer();
