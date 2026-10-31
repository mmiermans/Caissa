file(GLOB CAISSA_SOURCES *.cpp)

add_executable(caissa ${CAISSA_SOURCES})

set_property(TARGET caissa PROPERTY INTERPROCEDURAL_OPTIMIZATION TRUE)

add_dependencies(caissa backend)

target_link_libraries(caissa PRIVATE backend)

# Emscripten links threads through -pthread (root CMakeLists.txt); FindThreads fails its check there
if (NOT MSVC AND NOT EMSCRIPTEN)
	find_package(Threads REQUIRED)
	target_link_libraries(caissa PRIVATE Threads::Threads)

	if (NUMA_FOUND)
		target_link_libraries(caissa PRIVATE NUMA::numa)
	endif()
endif()

# WebAssembly: main() runs in a worker thread and takes commands from UciCommand() (see UCI.cpp).
# Growing memory with threads only slows JavaScript's access to it, which happens only while
# loading the net.
# - node: files are read straight from disk, and NodeStdin.js passes stdin to the engine.
# - web: an ES module (createCaissa) for a dedicated Web Worker. The host writes the net into the
#   in-memory file system before main() runs, sends commands with ccall('UciCommand') and reads
#   the output through print. Threads need a cross-origin isolated page.
if (EMSCRIPTEN)
	target_link_options(caissa PRIVATE
		-sPROXY_TO_PTHREAD -sPTHREAD_POOL_SIZE=4
		-sALLOW_MEMORY_GROWTH -Wno-pthreads-mem-growth
		-sSTACK_SIZE=8MB -sDEFAULT_PTHREAD_STACK_SIZE=8MB)
	if (WASM_ENVIRONMENT STREQUAL "web")
		target_link_options(caissa PRIVATE
			-sENVIRONMENT=web,worker -sMODULARIZE -sEXPORT_ES6 -sEXPORT_NAME=createCaissa
			-sEXPORTED_RUNTIME_METHODS=ccall,FS
			-sINITIAL_MEMORY=128MB -sMAXIMUM_MEMORY=2GB)
	else()
		set_property(TARGET caissa APPEND PROPERTY LINK_DEPENDS ${CMAKE_CURRENT_SOURCE_DIR}/NodeStdin.js)
		target_link_options(caissa PRIVATE
			-sENVIRONMENT=node -sNODERAWFS -sEXIT_RUNTIME
			--pre-js ${CMAKE_CURRENT_SOURCE_DIR}/NodeStdin.js -sEXPORTED_RUNTIME_METHODS=ccall
			-sINITIAL_MEMORY=256MB -sMAXIMUM_MEMORY=4GB)
	endif()
	if (WASM_PROFILING)
		target_link_options(caissa PRIVATE --profiling-funcs)
	endif()
endif()
