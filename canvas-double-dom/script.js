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
		self._current = 0;

		self.canvasA = document.createElement('canvas');
		self.canvasA.width  = self.fftSize / 2;
		self.canvasA.height = self.historySize;

		self.canvasB = document.createElement('canvas');
		self.canvasB.width  = self.fftSize / 2;
		self.canvasB.height = self.historySize;

		self.container.appendChild(self.canvasB);
		self.container.appendChild(self.canvasA);

		self.container.style.position = "relative";
		self.container.style.height = self.historySize + 'px';
		self.container.style.width = "100%";
		self.container.style.overflow = "hidden";

		self.canvasA.style.display = self.canvasB.style.display = "block";
		self.canvasA.style.margin = self.canvasB.style.margin = "0";
		self.canvasA.style.padding = self.canvasB.style.padding = "0";
		self.canvasA.style.width = self.canvasB.style.width = "100%";
		self.canvasA.style.height = self.canvasB.style.height = "100%";

		document.body.appendChild(self.container);
	},

	renderLine : function (array) {
		var self = this;

		var ctx = self.canvasA.getContext('2d');
		var imageData = ctx.getImageData(0, self._current, self.canvasA.width, 1);
		var data = imageData.data; // rgba

		for (var i = 0, len = self.canvasA.width; i < len; i++) {
			var n = i * 4;
			var rgb = convertDecibelToRGB(array[i]);

			data[n + 0] = rgb.r;
			data[n + 1] = rgb.g;
			data[n + 2] = rgb.b;
			data[n + 3] = 255;
		}

		ctx.putImageData(imageData, 0, self._current);

		self._current++;
		cancelAnimationFrame(self._requested);
		self._requested = requestAnimationFrame(function () {
			self.canvasB.style.marginTop = (self.canvasA.height - self._current - self.canvasB.height) + 'px';
		});

		if (self._current > self.canvasA.height) {
			self._current = 0;

			self.canvasB.style.marginTop = 0;

			// swap
			var tmp = self.canvasB;
			self.canvasB = self.canvasA;
			self.canvasA = tmp;
			self.container.appendChild(self.canvasA);
		}
	}
};


new SpectrumAnalyzer();
