package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func SetRoutes(r *gin.Engine) {
	SetGET(r)
	SetPOST(r)
	SetDELETE(r)
	r.NoRoute(Set404)
}

func Set404(c *gin.Context) {
	c.String(http.StatusNotFound, "404 Not Found")
}
