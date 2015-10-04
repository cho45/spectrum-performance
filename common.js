navigator.getUserMedia = ( navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia );
window.AudioContext = ( window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext);


function analyzeAudioStream (fftSize, callback) {
	var audioContext = new AudioContext();

	navigator.getUserMedia({ audio: true }, function (stream) {
		var mediaStreamSource = audioContext.createMediaStreamSource(stream);
		var analyzerNode = audioContext.createAnalyser();
		analyzerNode.fftSize = fftSize;

		mediaStreamSource.connect(analyzerNode);

		var buffer = new Float32Array(analyzerNode.frequencyBinCount);

		requestAnimationFrame(function render () {
			analyzerNode.getFloatFrequencyData(buffer);

			callback(buffer);

			requestAnimationFrame(render);
		});
	}, function (err) {
		alert(err);
	});
}

function convertDecibelToRGB (dB) {
	var r = 0, g = 0, b = 0;
	var p = (dB + 100) / 70;

	switch (true) {
		case p > 5.0/6.0:
			// yellow -> red
			p = (p - (5 / 6.0)) / (1 / 6.0);
			r = 255;
			g = 255 * p;
			b = 255 * p;
			break;
		case p > 4.0/6.0:
			// yellow -> red
			p = (p - (4 / 6.0)) / (1 / 6.0);
			r = 255;
			g = 255 * (1 - p);
			b = 0;
			break;
		case p > 3.0/6.0:
			// green -> yellow
			p = (p - (3 / 6.0)) / (1 / 6.0);
			r = 255 * p;
			g = 255;
			b = 0;
			break;
		case p > 2.0/6.0:
			// light blue -> green
			p = (p - (2 / 6.0)) / (1 / 6.0);
			r = 0;
			g = 255;
			b = 255 * (1 - p);
			break;
		case p > 1.0/6.0:
			// blue -> light blue
			p = (p - (1 / 6.0)) / (1 / 6.0);
			r = 0;
			g = 255 * p;
			b = 255;
			break;
		case p > 0:
			// black -> blue
			p = p / (1 / 6.0);
			r = 0;
			g = 0;
			b = 255 * p;
	}

	return { r: r, g: g, b : b };
}
