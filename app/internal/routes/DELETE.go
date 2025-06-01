package routes

import (
	"github.com/gin-gonic/gin"

	"github.com/pardnchiu/golang-image-caching-server/internal/handlers"
)

func SetDELETE(r *gin.Engine) {
	r.DELETE("/del/*path", handlers.DeleteFromPath)
}
