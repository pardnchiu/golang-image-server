package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/pardnchiu/golang-image-caching-server/internal/handlers"
)

func SetGET(r *gin.Engine) {
	r.GET("/check/state", handleHealthCheck)
	r.GET("/c/img/*path", handlers.GetFromPath)
}

func handleHealthCheck(c *gin.Context) {
	c.String(http.StatusOK, "ok")
}
