package routes

import (
	"github.com/gin-gonic/gin"

	"github.com/pardnchiu/golang-image-caching-server/internal/handlers"
)

func SetPOST(r *gin.Engine) {
	r.POST("/upload/*path", handlers.PostToPath)
}
