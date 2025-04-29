package main

import (
	"log"
	"math/rand"
	"time"

	"github.com/davidbyttow/govips/v2/vips"
	"github.com/gin-gonic/gin"

	"github.com/pardnchiu/golang-image-caching-server/internal/configs"
	"github.com/pardnchiu/golang-image-caching-server/internal/routes"
)

func main() {
	vips.Startup(nil)
	defer vips.Shutdown()

	rand.Seed(time.Now().UnixNano())

	r := gin.Default()

	routes.SetRoutes(r)

	port := configs.GetPort()
	log.Printf("Image Caching Server on: %s", port)
	r.Run(":" + port)
}
