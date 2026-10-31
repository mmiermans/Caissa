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

# WebAssembly, run with Node.js: main() runs in a worker thread, files are read straight from disk,
# and NodeStdin.js passes stdin to the engine. Growing memory with threads only slows JavaScript's
# access to it, which happens only while loading the net.
if (EMSCRIPTEN)
	set_property(TARGET caissa APPEND PROPERTY LINK_DEPENDS ${CMAKE_CURRENT_SOURCE_DIR}/NodeStdin.js)
	target_link_options(caissa PRIVATE
		-sENVIRONMENT=node -sNODERAWFS
		--pre-js ${CMAKE_CURRENT_SOURCE_DIR}/NodeStdin.js -sEXPORTED_RUNTIME_METHODS=ccall
		-sPROXY_TO_PTHREAD -sPTHREAD_POOL_SIZE=4 -sEXIT_RUNTIME
		-sALLOW_MEMORY_GROWTH -sINITIAL_MEMORY=256MB -sMAXIMUM_MEMORY=4GB -Wno-pthreads-mem-growth
		-sSTACK_SIZE=8MB -sDEFAULT_PTHREAD_STACK_SIZE=8MB)
	if (WASM_PROFILING)
		target_link_options(caissa PRIVATE --profiling-funcs)
	endif()
endif()
