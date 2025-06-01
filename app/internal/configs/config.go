package configs

import (
	"log"
	"os"
)

func ModeDev() bool {
	return os.Getenv("GO_ENV") == "development"
}

func GetPort() string {
	if port := os.Getenv("PORT"); port != "" {
		return port
	}

	return "8080"
}

func GetDomain() string {
	if ModeDev() {
		return "http://localhost:" + GetPort()
	}

	return "https://" + os.Getenv("DOMAIN")
}

func GetRootPath() string {
	rootPath, err := os.Getwd()

	if err != nil {
		log.Fatalf("Can not get root path: %v", err)
	}

	return rootPath
}

func GetUploadPath() string {
	return GetRootPath() + "/storage/image/upload"
}

func GetCachePath() string {
	return GetRootPath() + "/storage/image/cache"
}

func GetTrashPath() string {
	return GetRootPath() + "/storage/image/upload/.trash"
}

func Get404SVG(theme string) string {
	if theme != "dark" {
		theme = "light"
	}

	return GetRootPath() + "/internal/assets/image/404-" + theme + ".svg"
}
