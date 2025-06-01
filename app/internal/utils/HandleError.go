package utils

import (
	"log"

	"github.com/gin-gonic/gin"

	"github.com/pardnchiu/golang-image-caching-server/internal/configs"
)

func HandleError(c *gin.Context, statusCode int, message string, err error) {
	log.Printf("├── [ERROR] %s", message)
	log.Printf("└── [ERROR] %s", err.Error())
	c.String(statusCode, message)
}

func HandleGetError(c *gin.Context, statusCode int, message string, theme string, err error) {
	log.Printf("├── [ERROR] %s", message)
	log.Printf("└── [ERROR] %s", err.Error())

	c.Header("Content-Type", "image/svg+xml")
	c.Header("Cache-Control", "no-cache")
	c.Header("Expires", "-1")
	c.Header("Pragma", "no-cache")

	svgTheme := "light"

	if theme == "1" || theme == "dark" {
		svgTheme = "dark"
	}

	c.File(configs.Get404SVG(svgTheme))
}
