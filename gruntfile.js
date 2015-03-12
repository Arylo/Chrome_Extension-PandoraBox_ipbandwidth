module.exports = function(grunt) {
	var paths = {
        main: "src/",
        dest: "public/",
        temp: "build/"
	};
    var _pkg = grunt.file.readJSON('package.json');
    _pag.name = _pkg.name.replace('[Chrome]', '')
	grunt.initConfig({
        clean: {
            tmp: {
                src: paths.temp
            },
            dest: {
                src: paths.dest
            }
        },
        copy: {
        	main: {
				expand: true,
                cwd: paths.main,
                src: "**",
                dest: paths.temp,
                filter: "isFile"
        	}
        },
        compress: {
            main: {
                options: {
                  archive: paths.dest + '[Chrome]' + _pkg.name + '.zip'
                },
                expand: true,
                cwd: paths.temp,
                src: "**",
                dest: _pkg.name
            }
        }
	});
	grunt.registerTask('default', ["deploy"]);
	grunt.registerTask('deploy', ["clean", "copy", "compress"]);

	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-compress');
}
