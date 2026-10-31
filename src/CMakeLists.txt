add_subdirectory("backend")
add_subdirectory("frontend")
# the tools need a full OS (files, processes); WebAssembly builds only the engine
if (NOT EMSCRIPTEN)
    add_subdirectory("utils")
endif()
