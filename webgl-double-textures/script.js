SpectrumAnalyzer = function () { this.init.apply(this, arguments) };
SpectrumAnalyzer.prototype = {
	init : function () {
		var self = this;

		self.fftSize = 8192;
		self.historySize = 512;

		self.initWebGL();
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

	initWebGL : function () {
		var self = this;
		self._current = 0;

		self.container = document.createElement('div');
		self.canvas = document.createElement('canvas');
		self.canvas.width  = self.fftSize / 2;
		self.canvas.height = self.historySize;
		self.container.style.width = "100%";
		self.canvas.style.width = "100%";
		self.canvas.style.height = self.historySize + "px";
		self.container.appendChild(self.canvas);
		document.body.appendChild(self.container);

		try {
			self.gl = self.canvas.getContext("webgl") || self.canvas.getContext("experimental-webgl");
		} catch (e) {
		}

		if (!self.gl) {
			alert("Unable to initialize WebGL. Your browser may not support it.");
			return;
		}

		var gl = self.gl;

		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
		gl.disable(gl.BLEND);

		gl.viewport(0, 0, self.canvas.width, self.canvas.height);
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, document.getElementById('fragment-shader').innerText);
		gl.compileShader(fragmentShader);
		if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {  
			alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(fragmentShader));  
			return;
		}

		var vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, document.getElementById('vertex-shader').innerText);
		gl.compileShader(vertexShader);
		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {  
			alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(vertexShader));  
			return;
		}

		self.shaderProgram = gl.createProgram();
		gl.attachShader(self.shaderProgram, vertexShader);
		gl.attachShader(self.shaderProgram, fragmentShader);
		gl.linkProgram(self.shaderProgram);

		if (!gl.getProgramParameter(self.shaderProgram, gl.LINK_STATUS)) {
			alert("Unable to initialize the shader program.");
		}

		gl.useProgram(self.shaderProgram);

		self.vertexPositionAttribute = gl.getAttribLocation(self.shaderProgram, "aVertexPosition");
		gl.enableVertexAttribArray(self.vertexPositionAttribute);

		self.vertices1 = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, self.vertices1);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			1.0,  1.0,  0.0,
			-1.0, 1.0,  0.0,
			1.0,  -1.0, 0.0,
			-1.0, -1.0, 0.0
		]), gl.STATIC_DRAW);

		// texture sources
		self.textures = [gl.createTexture(), gl.createTexture()];

		// just for initializing
		var canvas = document.createElement('canvas');
		canvas.width  = self.fftSize / 2;
		canvas.height = self.historySize;

		for (var i = 0, it; (it = self.textures[i]); i++) {
			gl.bindTexture(gl.TEXTURE_2D, it);
			gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
			gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.bindTexture(gl.TEXTURE_2D, null);
		}

		gl.uniform2f(gl.getUniformLocation(self.shaderProgram, 'uViewCoords'), self.canvas.width, self.canvas.height);

		gl.bindBuffer(gl.ARRAY_BUFFER, self.vertices1);
		gl.vertexAttribPointer(self.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, self.textures[1]);
		gl.uniform1i(gl.getUniformLocation(self.shaderProgram, "uTexture1"), 1);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, self.textures[0]);
		gl.uniform1i(gl.getUniformLocation(self.shaderProgram, "uTexture0"), 0);

		gl.bindTexture(gl.TEXTURE_2D, self.textures[0]);

		self.render();
	},

	render : function () {
		var self = this;
		var gl = self.gl;

		gl.uniform1f(gl.getUniformLocation(self.shaderProgram, 'uOffsetY'), self._current);

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	},

	renderLine : function (array) {
		var self = this;

		var gl = self.gl;

		var data = new Uint8Array(self.fftSize / 2 * 4);

		for (var i = 0, len = self.fftSize / 2; i < len; i++) {
			var n = i * 4;
			var rgb = convertDecibelToRGB(array[i]);

			data[n + 0] = rgb.r;
			data[n + 1] = rgb.g;
			data[n + 2] = rgb.b;
			data[n + 3] = 255;
		}

		var xoffset = 0, yoffset = self._current, width = self.fftSize / 2, height = 1;
		gl.texSubImage2D(gl.TEXTURE_2D, 0, xoffset, yoffset, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data);

		self._current++;

		if (self._current >= self.historySize) {
			self._current = 0;
			self.textures.push(self.textures.shift());

			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, self.textures[1]);
			gl.uniform1i(gl.getUniformLocation(self.shaderProgram, "uTexture1"), 1);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, self.textures[0]);
			gl.uniform1i(gl.getUniformLocation(self.shaderProgram, "uTexture0"), 0);

		}

		self.render();

	}
};


new SpectrumAnalyzer();

