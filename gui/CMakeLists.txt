cmake_minimum_required( VERSION 3.26 )
project( SQUAD_GPS )
set( CMAKE_CXX_STANDARD 17 )

if (NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif(NOT CMAKE_BUILD_TYPE)

if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif(NOT CMAKE_BUILD_TYPE)

set( CMAKE_CXX_FLAGS_RELEASE "-g -Wall -O3" )

set( JS ${CMAKE_SOURCE_DIR}/src/lib )
file( MAKE_DIRECTORY ${JS} )
set( CMAKE_RUNTIME_OUTPUT_DIRECTORY ${JS} )


# Needed for opencv2/opencv.hpp
include_directories(third_party/opencv/include)
# Needed by opencv.hpp for opencv2/opencv_modules.hpp
include_directories(third_party/opencv/build_wasm)

file (GLOB opencv_include_modules "third_party/opencv/modules/**/include")
include_directories(${opencv_include_modules})

include_directories(${BUILD_WASM})
include_directories( ~/Builds/emsdk/upstream/emscripten/system/include )

set( SRC_DIR emscripten )
include_directories( ${SRC_DIR} )

file( GLOB PROJECT_SRCS ${SRC_DIR}/*.cpp )

add_executable( img_tracker_wasm ${SRC_DIR}/img_tracker_wasm.cpp)

file( GLOB opencv_js "third_party/opencv/build_wasm/lib/*.a" )
target_link_libraries( img_tracker_wasm ${opencv_js} )
set_target_properties( img_tracker_wasm PROPERTIES LINK_FLAGS "-s EXPORT_NAME='ImageTrackerWASM' -s USE_ZLIB=1 -s MODULARIZE=1 -s ALLOW_MEMORY_GROWTH=1 -s EXPORTED_FUNCTIONS='['_malloc', '_free']' -s EXPORTED_RUNTIME_METHODS='['cwrap', 'getValue']' -s WASM=1 -s ENVIRONMENT='web' -s EXPORT_ES6=1" )
