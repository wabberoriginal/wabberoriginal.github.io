# Flow Distribution in Single-Use IV Filters

When you push fluid through a clinical in-line filter — the kind used in IV therapy to catch particles and air — you'd hope the flow distributes evenly across the membrane. Spoiler: it doesn't.

## The Problem

Single-use IV filters contain a flat membrane housed in a small plastic casing. Fluid enters from one side, passes through a manifold of parallel channels, crosses the membrane, and exits on the other side. The geometry of that manifold determines how evenly the flow is distributed.

Maldistribution matters because:

- **Uneven loading** reduces effective membrane area, shortening filter life
- **Local high-velocity zones** increase shear stress and the risk of particle re-entrainment
- **Dead zones** can trap air bubbles, which is exactly what the filter is supposed to prevent

## How We Measured It

We used **MRI velocimetry** — specifically, phase-contrast MRI on a Siemens Magnetom Skyra — to map the velocity field inside the filter non-invasively. This gives us a full 3D picture of where the fluid is going, without needing to modify the device.

The key sequence parameters were:

```
Sequence:       2D phase-contrast (VENC = 15 cm/s)
Resolution:     0.3 × 0.3 × 1.0 mm³
Repetitions:    8 averages
Flow rate:      5 mL/min (water, room temperature)
```

## The CFD Model

In parallel, we built a COMSOL Multiphysics model of the filter geometry. The mesh was the tricky part — boundary layers near the membrane surface needed at least 5 prismatic layers to resolve the velocity gradients, while the manifold channels required a fine enough mesh to capture the flow splitting.

The governing equations are straightforward Navier-Stokes for incompressible flow:

$$\rho (\mathbf{u} \cdot \nabla)\mathbf{u} = -\nabla p + \mu \nabla^2 \mathbf{u}$$

with Darcy's law for the membrane:

$$\mathbf{u}_m = -\frac{\kappa}{\mu} \nabla p$$

## Quantifying Maldistribution

To put a number on how *uneven* the flow is, we used the **Coefficient of Variation** (CV) of the flow rate across parallel channels:

$$CV = \frac{\sigma_Q}{\bar{Q}} \times 100\%$$

where $\sigma_Q$ is the standard deviation and $\bar{Q}$ the mean flow rate across all channels. A perfect distribution gives CV = 0%. In practice, we measured CV values between 15–40% depending on the operating conditions.

## What We Learned

The main driver of maldistribution turned out to be the **inlet manifold geometry** — not the membrane resistance, which is what you might naively expect. At low flow rates, the pressure drop across the membrane dominates, and distribution is relatively even. But as flow rate increases, inertial effects in the manifold take over and the distribution becomes increasingly skewed.

> The membrane doesn't care about flow distribution. The manifold does.

This has practical implications: if you want to improve filter performance, redesigning the housing geometry is more impactful than tweaking membrane properties.

---

*This post summarizes work currently under review. I'll link the publication once it's out.*
