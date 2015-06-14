"use strict";

module.exports = function(grunt) {
	var paths = {
        main: "src/",
        dest: "public/",
        temp: "build/"
	};
    var _pkg = grunt.file.readJSON('package.json');
    _pkg.name = _pkg.name.replace('[Chrome]', '');
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
        cssmin: {
            main: {
                expand: true,
                cwd: paths.main,
                src: "**/*.css",
                dest: paths.temp,
                filter: "isFile"
            }
        },
        uglify: {
        	main: {
				expand: true,
                cwd: paths.main,
                src: "**/*.js",
                dest: paths.temp,
                filter: "isFile"
        	}
        },
        jshint: {
            options: {
                jshintrc: true,
                force: true
            },
            main: ["./gruntfile.js", "./src/js/*.js"]
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
	grunt.registerTask('deploy', ["clean", "copy", "cssmin", "jshint", "uglify", "compress"]);

	require('load-grunt-tasks')(grunt);
};
